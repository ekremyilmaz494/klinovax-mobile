import { forwardRef } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { FontFamily } from '../fonts';
import { useTheme } from '../theme';
import { Type, type TypeVariant } from '../typography';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'success'
  | 'onAccent'
  | 'onInverse'
  | 'inherit';

// Bir variant'ın BOYUTUNU koruyup yalnızca ağırlığını değiştirmek için. Inline
// `fontFamily: 'InterTight_600SemiBold'` override'larının yerini alır (footnote/body
// üstüne vurgu). Fraunces/timer/metric istisnaları variant veya inline kalır.
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const weightFamily: Record<TextWeight, string> = {
  regular: FontFamily.body,
  medium: FontFamily.bodyMedium,
  semibold: FontFamily.bodySemibold,
  bold: FontFamily.bodyBold,
};

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Variant boyutunu koruyarak ağırlığı değiştirir (Inter Tight ailesi). */
  weight?: TextWeight;
  align?: TextStyle['textAlign'];
  italic?: boolean;
  style?: RNTextProps['style'];
}

function toneColor(
  tone: TextTone,
  colors: ReturnType<typeof useTheme>['colors'],
): string | undefined {
  switch (tone) {
    case 'primary':
      return colors.text.primary;
    case 'secondary':
      return colors.text.secondary;
    case 'tertiary':
      return colors.text.tertiary;
    case 'danger':
      return colors.text.danger;
    case 'success':
      return colors.text.success;
    case 'onAccent':
      return colors.accent.clayOnAccent;
    case 'onInverse':
      return colors.text.onInverse;
    case 'inherit':
      return undefined;
  }
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = 'body', tone = 'primary', weight, align, italic, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const variantStyle = Type[variant];
  const color = toneColor(tone, colors);
  return (
    <RNText
      ref={ref}
      style={[
        variantStyle,
        // weight, variant'ın fontFamily'sini ezer ama açık `style` prop'u hâlâ kazanır.
        weight ? { fontFamily: weightFamily[weight] } : null,
        { color },
        align ? { textAlign: align } : null,
        italic ? { fontStyle: 'italic' } : null,
        style,
      ]}
      {...rest}
    />
  );
});
