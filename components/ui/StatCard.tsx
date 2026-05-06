import { View, type ViewStyle } from 'react-native';
import { Text, useTheme } from '@/design-system';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  value: number | string;
  tone?: Tone;
  /** Hairline divider variant (no card chrome) — for use inside grouped containers */
  flat?: boolean;
  style?: ViewStyle;
};

export function StatCard({ label, value, tone = 'default', flat = false, style }: Props) {
  const t = useTheme();
  const accent =
    tone === 'success'
      ? t.colors.status.success
      : tone === 'warning'
        ? t.colors.status.warning
        : tone === 'danger'
          ? t.colors.status.danger
          : tone === 'info'
            ? t.colors.text.secondary
            : t.colors.text.primary;

  const cardStyle: ViewStyle = flat
    ? { flex: 1, paddingVertical: 20, paddingHorizontal: 16 }
    : {
        flex: 1,
        minWidth: 0,
        borderRadius: t.radius.lg,
        paddingVertical: 22,
        paddingHorizontal: 18,
        backgroundColor: t.colors.surface.primary,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
      };

  return (
    <View style={[cardStyle, style]}>
      <Text variant="overline" tone="tertiary" numberOfLines={1} style={{ marginBottom: 8 }}>
        {label}
      </Text>
      <Text variant="metric" style={{ color: accent }}>
        {value}
      </Text>
    </View>
  );
}
