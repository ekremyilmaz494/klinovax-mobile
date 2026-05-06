import { forwardRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export type CardVariant = 'default' | 'accent' | 'warning' | 'success' | 'danger';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: keyof ReturnType<typeof useTheme>['space'];
  radius?: keyof ReturnType<typeof useTheme>['radius'];
  /** show a left rail accent strip in the variant color */
  rail?: boolean;
}

export const Card = forwardRef<View, CardProps>(function Card(
  { variant = 'default', padding = 4, radius = 'lg', rail = false, style, children, ...rest },
  ref,
) {
  const t = useTheme();
  const bg =
    variant === 'accent'
      ? t.colors.accent.bgMuted
      : variant === 'warning'
        ? t.colors.status.warningBg
        : variant === 'success'
          ? t.colors.status.successBg
          : variant === 'danger'
            ? t.colors.status.dangerBg
            : t.colors.surface.primary;
  const borderColor =
    variant === 'accent'
      ? t.colors.accent.clay
      : variant === 'warning'
        ? t.colors.status.warning
        : variant === 'success'
          ? t.colors.status.success
          : variant === 'danger'
            ? t.colors.status.danger
            : t.colors.border.subtle;
  // Rail variant=default ile çağrıldığında subtle gri yerine clay accent kullan;
  // diğer variant'larda rail rengi zaten variant'ın border rengi (uyumlu).
  const railColor = variant === 'default' ? t.colors.accent.clay : borderColor;
  const cardStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: t.radius[radius],
    padding: t.space[padding],
    borderWidth: variant === 'default' ? t.hairline : 1,
    borderColor,
    borderLeftWidth: rail ? 3 : variant === 'default' ? t.hairline : 1,
    borderLeftColor: rail ? railColor : borderColor,
    overflow: 'hidden',
  };
  return (
    <View ref={ref} style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
});
