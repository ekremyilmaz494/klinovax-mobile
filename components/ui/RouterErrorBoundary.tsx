import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, Stack, Text, useTheme } from '@/design-system';
import { captureBoundaryError } from '@/lib/sentry';

type Props = ErrorBoundaryProps & {
  /** Sentry'de root/exam ayrımı için boundary tag'i. Default 'root'. */
  context?: string;
};

/**
 * Expo Router route-level error boundary. Bir route'un render'ı throw ettiğinde
 * beyaz ekran yerine bu kurtarma UI'ı gösterilir; `retry()` route'u remount eder.
 *
 * Root ve exam grup layout'ları bunu `ErrorBoundary` olarak re-export eder
 * (context ile farklı tag'leyerek Sentry'de hangi katmanın patladığı görünür).
 */
export function RouterErrorBoundary({ error, retry, context }: Props) {
  const t = useTheme();

  // Mount'ta bir kez raporla — aynı error nesnesi için tekrar capture etme.
  useEffect(() => {
    captureBoundaryError(error, context);
  }, [error, context]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: t.space[6],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack direction="column" gap={3} style={{ alignItems: 'center', maxWidth: 340 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: t.colors.status.dangerBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: t.space[1],
            }}
          >
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={30}
              color={t.colors.status.danger}
            />
          </View>

          <Text variant="title-2" tone="primary" align="center">
            Bir şeyler ters gitti
          </Text>
          <Text variant="body" tone="tertiary" align="center">
            Beklenmeyen bir hata oluştu. Tekrar deneyebilirsin.
          </Text>

          {/* Hata detayını sadece dev'de göster — production'da iç bilgi sızdırma. */}
          {__DEV__ ? (
            <Text variant="mono" tone="secondary" align="center" style={{ marginTop: t.space[1] }}>
              {error.message}
            </Text>
          ) : null}

          <View style={{ marginTop: t.space[2] }}>
            <Button label="Tekrar dene" variant="primary" onPress={retry} />
          </View>
        </Stack>
      </View>
    </SafeAreaView>
  );
}
