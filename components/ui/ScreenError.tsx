import { View } from 'react-native'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { Button, Text, useTheme } from '@/design-system'

type Props = {
  message: string
  onRetry?: () => void
}

export function ScreenError({ message, onRetry }: Props) {
  const t = useTheme()
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
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={28}
          color={t.colors.status.danger}
        />
      </View>
      <Text variant="title-3" tone="primary" align="center">
        Bir sorun oluştu
      </Text>
      <Text variant="body" tone="tertiary" align="center" style={{ maxWidth: 320 }}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: 8 }}>
          <Button label="Tekrar dene" variant="primary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  )
}
