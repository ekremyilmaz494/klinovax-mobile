import { forwardRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface StackProps extends ViewProps {
  direction?: 'row' | 'column';
  gap?: keyof ReturnType<typeof useTheme>['space'];
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
}

export const Stack = forwardRef<View, StackProps>(function Stack(
  { direction = 'column', gap, align, justify, wrap, flex, style, children, ...rest },
  ref,
) {
  const t = useTheme();
  const baseStyle: ViewStyle = {
    flexDirection: direction,
    gap: gap != null ? t.space[gap] : undefined,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : undefined,
    flex,
  };
  return (
    <View ref={ref} style={[baseStyle, style]} {...rest}>
      {children}
    </View>
  );
});
