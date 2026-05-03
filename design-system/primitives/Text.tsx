import { forwardRef } from 'react'
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native'
import { useTheme } from '../theme'
import { Type, type TypeVariant } from '../typography'

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'success'
  | 'onAccent'
  | 'onInverse'
  | 'inherit'

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypeVariant
  tone?: TextTone
  align?: TextStyle['textAlign']
  italic?: boolean
  style?: RNTextProps['style']
}

function toneColor(tone: TextTone, colors: ReturnType<typeof useTheme>['colors']): string | undefined {
  switch (tone) {
    case 'primary': return colors.text.primary
    case 'secondary': return colors.text.secondary
    case 'tertiary': return colors.text.tertiary
    case 'danger': return colors.text.danger
    case 'success': return colors.text.success
    case 'onAccent': return colors.accent.clayOnAccent
    case 'onInverse': return colors.text.onInverse
    case 'inherit': return undefined
  }
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = 'body', tone = 'primary', align, italic, style, ...rest },
  ref,
) {
  const { colors } = useTheme()
  const variantStyle = Type[variant]
  const color = toneColor(tone, colors)
  return (
    <RNText
      ref={ref}
      style={[
        variantStyle,
        { color },
        align ? { textAlign: align } : null,
        italic ? { fontStyle: 'italic' } : null,
        style,
      ]}
      {...rest}
    />
  )
})
