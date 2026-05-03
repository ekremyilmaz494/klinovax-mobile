import { DarkTheme, DefaultTheme, ThemeProvider, type Theme as NavTheme } from '@react-navigation/native'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useRef, useState } from 'react'
import 'react-native-reanimated'
import 'react-native-url-polyfill/auto'

import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen'
import { OfflineBanner } from '@/components/network/OfflineBanner'
import { darkTheme, FontFamily, FontMap, lightTheme } from '@/design-system'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useUnreadCount } from '@/hooks/use-notifications'
import { setOnAuthFailure } from '@/lib/api/client'
import { setBadgeCount } from '@/lib/notifications/badge'
import { setupNotifications } from '@/lib/notifications/handler'
import { registerForPushNotifications } from '@/lib/notifications/push'
import { registerMutationDefaults } from '@/lib/query/mutation-defaults'
import { setupOnlineBridge } from '@/lib/query/online-bridge'
import { clearPersistedQueryCache, persistOptions } from '@/lib/query/persister'
import { useAuthStore } from '@/store/auth'

SplashScreen.preventAutoHideAsync().catch(() => {})

function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        // Offline persistence ile uyumlu: cache 24 saat geçerli, stale 30 sn
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
      },
    },
  })
  // Mutation defaults provider mount'undan ÖNCE kayıtlı olmalı:
  // rehydrate sırasında mutation cache'e koyulan paused mutation'lar
  // mutationFn'i bu registry'den arar.
  registerMutationDefaults(client)
  return client
}

/**
 * Auth-gated navigation: hydrated olunca user durumuna göre ya (auth) grubuna
 * ya da (tabs) grubuna yönlendirir. İlk render hydrate bitmeden boş kalır.
 *
 * Push token registration: kullanıcı authenticate VE unlocked olduğunda bir kez
 * tetiklenir; başarısız olursa sessiz geçer (push opsiyonel).
 */
function AuthGate() {
  const router = useRouter()
  const segments = useSegments()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const unlocked = useAuthStore((s) => s.unlocked)
  const hydrated = useAuthStore((s) => s.hydrated)
  const hydrate = useAuthStore((s) => s.hydrate)
  const logout = useAuthStore((s) => s.logout)
  const navigatedRef = useRef(false)
  const pushRegisteredRef = useRef(false)
  const wasAuthedRef = useRef(false)

  useEffect(() => { void hydrate() }, [hydrate])

  // API client'taki refresh-AUTH-failure'da Zustand store'u temizle.
  // Network failure'da tetiklenmez — offline'da zorla logout etmeyiz.
  useEffect(() => {
    setOnAuthFailure(logout)
    return () => setOnAuthFailure(null)
  }, [logout])

  useEffect(() => {
    if (!hydrated) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      navigatedRef.current = true
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      navigatedRef.current = true
      router.replace('/(tabs)/dashboard')
    }
  }, [hydrated, user, segments, router])

  // Push registration — user oturum açmış + biometric kilidi geçilmişse bir kez
  useEffect(() => {
    if (!hydrated || !user || !unlocked || pushRegisteredRef.current) return
    pushRegisteredRef.current = true
    void registerForPushNotifications()
  }, [hydrated, user, unlocked])

  // Logout transition (was authed → null user): eski kullanıcıya ait query ve
  // paused mutation'lar ortak cihazda yeni oturuma sızmamalı.
  useEffect(() => {
    if (!hydrated) return
    if (user) {
      wasAuthedRef.current = true
    } else if (wasAuthedRef.current) {
      wasAuthedRef.current = false
      pushRegisteredRef.current = false
      queryClient.clear()
      void clearPersistedQueryCache()
    }
  }, [hydrated, user, queryClient])

  return null
}

export const unstable_settings = {
  anchor: '(tabs)',
}

function LockOverlay() {
  const user = useAuthStore((s) => s.user)
  const unlocked = useAuthStore((s) => s.unlocked)
  const hydrated = useAuthStore((s) => s.hydrated)
  if (!hydrated || !user || unlocked) return null
  return <BiometricLockScreen />
}

/**
 * iOS app icon kırmızı sayı'yı feed unread count'una sync eder. Hook tabs
 * dışında da çalışsın diye Provider altındaki ayrı bir component'tan değil,
 * RootLayout içinden çağırıyoruz (Provider'ın içinde her zaman mount).
 */
function BadgeSync() {
  const unreadCount = useUnreadCount()
  useEffect(() => {
    void setBadgeCount(unreadCount)
  }, [unreadCount])
  return null
}

function buildNavigationTheme(mode: 'light' | 'dark'): NavTheme {
  const t = mode === 'dark' ? darkTheme : lightTheme
  const base = mode === 'dark' ? DarkTheme : DefaultTheme
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.accent.clay,
      background: t.surface.canvas,
      card: t.surface.primary,
      text: t.text.primary,
      border: t.border.subtle,
      notification: t.accent.clay,
    },
    fonts: {
      regular: { fontFamily: FontFamily.body, fontWeight: '400' },
      medium: { fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
      bold: { fontFamily: FontFamily.bodyBold, fontWeight: '700' },
      heavy: { fontFamily: FontFamily.displayBold, fontWeight: '700' },
    },
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  // QueryClient'ı useState initializer'da yarat: registerMutationDefaults'un
  // Provider mount'undan önce çalışmasını garanti eder. Module-level singleton
  // Fast Refresh + test setup'ta sızıntıya yol açabiliyordu.
  const [client] = useState(() => createQueryClient())
  const [fontsLoaded, fontError] = useFonts(FontMap)

  // Notification handler'ı bir kez mount'ta kur — foreground display + tap routing.
  // queryClient'a bağlı: foreground'da gelen push feed cache'ini invalidate eder.
  useEffect(() => {
    const teardown = setupNotifications(client)
    return teardown
  }, [client])

  // NetInfo → TanStack onlineManager bridge — mutation paused/resume için kritik
  useEffect(() => {
    const teardown = setupOnlineBridge()
    return teardown
  }, [])

  // Splash'i fontlar hazır olunca veya yükleme hatasında kapat
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, fontError])

  const navTheme = useMemo(
    () => buildNavigationTheme(colorScheme === 'dark' ? 'dark' : 'light'),
    [colorScheme],
  )
  const t = colorScheme === 'dark' ? darkTheme : lightTheme

  if (!fontsLoaded && !fontError) return null

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      onSuccess={() => {
        // Rehydrate tamamlandı — AsyncStorage'tan gelen paused mutation'lar
        // onlineManager online ise hemen replay olur, offline ise online dönüşünü bekler
        void client.resumePausedMutations()
      }}
    >
      <ThemeProvider value={navTheme}>
        <AuthGate />
        <BadgeSync />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.surface.canvas },
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: FontFamily.display, fontSize: 18, color: t.text.primary },
            headerTintColor: t.accent.clay,
            headerBackTitle: 'Geri',
            contentStyle: { backgroundColor: t.surface.canvas },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="trainings/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/start" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/questions" options={{ headerShown: true, gestureEnabled: false }} />
          <Stack.Screen name="exam/[assignmentId]/videos" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/result" options={{ headerShown: true, gestureEnabled: false }} />
          <Stack.Screen
            name="certificates/[id]/preview"
            options={{ headerShown: true, presentation: 'modal' }}
          />
          <Stack.Screen name="legal/[slug]" options={{ headerShown: true }} />
        </Stack>
        <LockOverlay />
        <OfflineBanner />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  )
}
