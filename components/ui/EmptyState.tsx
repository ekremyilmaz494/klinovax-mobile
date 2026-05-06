import { View } from 'react-native';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Text, useTheme } from '@/design-system';

type Props = {
  title: string;
  description?: string;
  icon?: IconSymbolName;
};

export function EmptyState({ title, description, icon = 'tray' }: Props) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingVertical: 64,
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
          backgroundColor: t.colors.surface.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <IconSymbol name={icon} size={28} color={t.colors.text.tertiary} />
      </View>
      <Text variant="title-3" tone="primary" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="tertiary" align="center" style={{ maxWidth: 320 }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
