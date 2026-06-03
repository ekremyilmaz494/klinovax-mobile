import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Button, Stack as UIStack, Text, useTheme } from '@/design-system';
import { isAllowedLegalUrl, LEGAL_TITLES, legalUrl } from '@/lib/legal/legal-url';
import { openLegal } from '@/lib/legal/open-legal';

const ALLOWED_SLUGS = new Set(Object.keys(LEGAL_TITLES));

/**
 * Yasal metin fallback ekranı (deep-link ile gelinirse). Profil'deki linkler artık
 * doğrudan in-app tarayıcıyı açıyor (lib/legal/open-legal.ts) — bu ekran yalnızca
 * `klinovax://legal/<slug>` deep-link'i için durur.
 *
 * **Çökme sertleştirmesi**: WebView Android'de render süreci ölünce
 * (`onRenderProcessGone`) handler yoksa uygulamayı KOMPLE çökertir
 * ("Klinovax sürekli olarak duruyor"). Burada onRenderProcessGone/onError/onHttpError
 * yakalanıp WebView kaldırılır ve çıkış yolu (tarayıcı/geri) sunulur — asla çökme/dead-end.
 */
export default function LegalScreen() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const safeSlug = ALLOWED_SLUGS.has(slug) ? slug : 'kvkk';
  const title = LEGAL_TITLES[safeSlug] ?? 'Yasal';
  const baseUrl = legalUrl(safeSlug);
  const initialUrl = `${baseUrl}?bare=1`;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const bg = t.colors.surface.canvas;

  if (failed) {
    return (
      <>
        <Stack.Screen options={{ title, headerBackTitle: 'Geri' }} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="title-3" align="center">
              Sayfa uygulama içinde açılamadı
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: 8 }}>
              {title} metnini tarayıcıda açabilir ya da geri dönebilirsin.
            </Text>
            <UIStack direction="column" gap={3} style={{ marginTop: 24, alignSelf: 'stretch' }}>
              <Button
                label="Tarayıcıda aç"
                variant="primary"
                size="lg"
                onPress={() =>
                  void openLegal(safeSlug, {
                    toolbar: t.colors.surface.canvas,
                    controls: t.colors.accent.clay,
                  })
                }
                fullWidth
              />
              <Button
                label="Geri dön"
                variant="outline"
                size="lg"
                onPress={() => router.back()}
                fullWidth
              />
            </UIStack>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const isAllowedRequest = (req: WebViewNavigation | { url: string }): boolean =>
    isAllowedLegalUrl(baseUrl, req.url);

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
          // Ağ/SSL hatası → boş ekran yerine fallback.
          onError={() => setFailed(true)}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 500) setFailed(true);
          }}
          // KRİTİK (Android): render süreci ölürse uygulamayı çökertme — WebView'ı
          // kaldırıp fallback göster. true döndürmek "ben hallettim" sinyali.
          onRenderProcessGone={() => {
            setFailed(true);
            return true;
          }}
          decelerationRate="normal"
          setSupportMultipleWindows={false}
        />
        {loading ? (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { alignItems: 'center', justifyContent: 'center', backgroundColor: bg },
            ]}
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color={t.colors.accent.clay} />
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}
