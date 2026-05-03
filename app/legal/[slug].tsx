import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, type WebViewNavigation } from 'react-native-webview'

import { useTheme } from '@/design-system'
import { API_BASE_URL } from '@/lib/config'

const TITLES: Record<string, string> = {
  kvkk: 'KVKK Aydınlatma Metni',
  terms: 'Kullanım Koşulları',
  privacy: 'Gizlilik Politikası',
}

const ALLOWED_SLUGS = new Set(Object.keys(TITLES))

/**
 * Yasal metinler (KVKK / Terms / Privacy) — site URL'sinden tek kaynak ile beslenir,
 * uygulama içinde WebView ile gösterilir. Safari'ye yönlendirme yok.
 *
 * **Navigation lock**: WebView içindeki tıklamalar (Klinovax logosu, "Giriş Yap"
 * butonu, footer linkleri vb.) yasal slug DIŞINA çıkamaz. `onShouldStartLoad`
 * yalnızca aynı slug'ın URL'lerine izin verir. Bu sayede header'daki "Geri"
 * butonu her zaman Profile'a döner — WebView history içinde gezinme yapılamaz.
 */
export default function LegalScreen() {
  const t = useTheme()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const safeSlug = ALLOWED_SLUGS.has(slug) ? slug : 'kvkk'
  const title = TITLES[safeSlug] ?? 'Yasal'
  const baseUrl = `${API_BASE_URL}/${safeSlug}`
  const initialUrl = `${baseUrl}?bare=1`
  const [loading, setLoading] = useState(true)

  const isAllowedRequest = (req: WebViewNavigation | { url: string }): boolean => {
    const url = req.url
    if (!url || url.startsWith('about:')) return true
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
    return url === baseUrl || url === initialUrl || url.startsWith(normalizedBase)
  }

  const bg = t.colors.surface.canvas

  return (
    <>
      <Stack.Screen options={{ title, headerBackTitle: 'Geri' }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: bg }}>
        <WebView
          source={{ uri: initialUrl }}
          style={{ flex: 1, backgroundColor: bg }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={isAllowedRequest}
          decelerationRate="normal"
        />
        {loading ? (
          <View
            style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: bg }]}
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color={t.colors.accent.clay} />
          </View>
        ) : null}
      </SafeAreaView>
    </>
  )
}
