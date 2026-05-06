import { forwardRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export type SurfaceTone = 'canvas' | 'primary' | 'secondary' | 'sunken';

export interface SurfaceProps extends ViewProps {
  as?: SurfaceTone;
  padding?: keyof ReturnType<typeof useTheme>['space'];
  radius?: keyof ReturnType<typeof useTheme>['radius'];
  border?: 'none' | 'subtle' | 'default' | 'strong';
}

export const Surface = forwardRef<View, SurfaceProps>(function Surface(
  { as = 'canvas', padding, radius, border = 'none', style, children, ...rest },
  ref,
) {
  const t = useTheme();
  const bg =
    as === 'canvas'
      ? t.colors.surface.canvas
      : as === 'primary'
        ? t.colors.surface.primary
        : as === 'secondary'
          ? t.colors.surface.secondary
          : t.colors.surface.sunken;
  const borderColor =
    border === 'subtle'
      ? t.colors.border.subtle
      : border === 'default'
        ? t.colors.border.default
        : border === 'strong'
          ? t.colors.border.strong
          : undefined;
  const baseStyle: ViewStyle = {
    backgroundColor: bg,
    padding: padding != null ? t.space[padding] : undefined,
    borderRadius: radius != null ? t.radius[radius] : undefined,
    borderWidth: borderColor ? t.hairline : 0,
    borderColor,
  };
  return (
    <View ref={ref} style={[baseStyle, style]} {...rest}>
      {children}
    </View>
  );
});
