import { View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, Text, useTheme } from '@/design-system';

type Props = {
  message: string;
  onRetry?: () => void;
  /** Başlık (varsayılan "Bir sorun oluştu"). Kalıcı hatalarda örn. "Eğitime erişilemiyor". */
  title?: string;
  /**
   * `onRetry` yokken gösterilen alternatif eylem — kalıcı (geri dönüşü olmayan) hatalar için.
   * Örn. 403/404: tekrar denemek anlamsız, kullanıcıyı listeye geri götür. `onRetry` varsa
   * yok sayılır (retry önceliklidir).
   */
  action?: { label: string; onPress: () => void };
};

export function ScreenError({ message, onRetry, title, action }: Props) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.colors.status.dangerBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <IconSymbol name="exclamationmark.triangle.fill" size={28} color={t.colors.status.danger} />
      </View>
      <Text variant="title-3" tone="primary" align="center">
        {title ?? 'Bir sorun oluştu'}
      </Text>
      <Text variant="body" tone="tertiary" align="center" style={{ maxWidth: 320 }}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: 8 }}>
          <Button label="Tekrar dene" variant="primary" onPress={onRetry} />
        </View>
      ) : action ? (
        <View style={{ marginTop: 8 }}>
          <Button label={action.label} variant="primary" onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}
