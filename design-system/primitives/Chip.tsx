import { Pressable, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: ChipProps) {
  const t = useTheme();
  const bg = selected ? t.colors.accent.clay : 'transparent';
  const fg = selected ? t.colors.accent.clayOnAccent : t.colors.text.secondary;
  const borderColor = selected ? t.colors.accent.clay : t.colors.border.default;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: t.radius.pill,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text variant="subhead" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
