import { Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hero, Stack, Text, useTheme } from '@/design-system';
import { LEGAL_CONTENT, type LegalSlug } from '@/lib/legal/content';

const SLUGS = new Set<LegalSlug>(['kvkk', 'terms', 'privacy']);

function resolveSlug(slug: string | undefined): LegalSlug {
  return slug && SLUGS.has(slug as LegalSlug) ? (slug as LegalSlug) : 'kvkk';
}

/**
 * Yasal metin ekranı — içerik artık uygulamada NATIVE render edilir (lib/legal/content.ts).
 * Eski WebView/in-app tarayıcı yönlendirmesi kaldırıldı: site açılmaz, metin Warm
 * Editorial tipografisiyle gösterilir. Hem profil linkleri hem `klinovax://legal/<slug>`
 * deep-link'i buraya gelir. WebView olmadığı için Android render-process çökmesi de yok.
 */
export default function LegalScreen() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const doc = LEGAL_CONTENT[resolveSlug(slug)];

  return (
    <>
      <ExpoStack.Screen options={{ title: doc.title, headerBackTitle: 'Geri' }} />
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ScrollView contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[12] }}>
          <Hero
            overline={doc.updatedAt ? `Son güncelleme · ${doc.updatedAt}` : undefined}
            title={doc.title}
          />

          {doc.intro?.map((p, i) => (
            <Text
              key={`intro-${i}`}
              variant="body"
              tone="secondary"
              style={{ marginBottom: t.space[3], lineHeight: 22 }}
            >
              {p}
            </Text>
          ))}

          {doc.sections.map((section, i) => (
            <View key={`section-${i}`} style={{ marginTop: t.space[5] }}>
              <Text variant="title-3" style={{ marginBottom: t.space[2] }}>
                {section.heading}
              </Text>

              {section.body?.map((p, j) => (
                <Text
                  key={`body-${j}`}
                  variant="body"
                  tone="secondary"
                  style={{ marginBottom: t.space[2], lineHeight: 22 }}
                >
                  {p}
                </Text>
              ))}

              {section.items ? (
                <View style={{ gap: t.space[2], marginTop: t.space[1] }}>
                  {section.items.map((item, k) => (
                    <Stack key={`item-${k}`} direction="row" gap={3} align="flex-start">
                      {/* Madde işareti — emoji/`•` değil küçük clay nokta (kural #2). */}
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          backgroundColor: t.colors.accent.clay,
                          marginTop: 8,
                        }}
                      />
                      <Text variant="body" tone="secondary" style={{ flex: 1, lineHeight: 22 }}>
                        {item}
                      </Text>
                    </Stack>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
