import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import 'react-native-reanimated'
import 'react-native-url-polyfill/auto'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { useAuthStore } from '@/store/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

/**
 * Auth-gated navigation: hydrated olunca user durumuna göre ya (auth) grubuna
 * ya da (tabs) grubuna yönlendirir. İlk render hydrate bitmeden boş kalır.
 */
function AuthGate() {
  const router = useRouter()
  const segments = useSegments()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const hydrate = useAuthStore((s) => s.hydrate)
  const navigatedRef = useRef(false)

  useEffect(() => { void hydrate() }, [hydrate])

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

  return null
}

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="trainings/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/start" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/questions" options={{ headerShown: true, gestureEnabled: false }} />
          <Stack.Screen name="exam/[assignmentId]/videos" options={{ headerShown: true }} />
          <Stack.Screen name="exam/[assignmentId]/result" options={{ headerShown: true, gestureEnabled: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
