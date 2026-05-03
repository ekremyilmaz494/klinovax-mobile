import { View } from 'react-native'
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol'
import { useTheme } from '../theme'
import { Text } from './Text'

export type IconDotVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'accent'

export interface IconDotProps {
  variant?: IconDotVariant
  size?: number
  /** Optional override icon. Defaults: success=checkmark, danger=xmark, neutral=circle.fill */
  icon?: IconSymbolName
  /** Render a number instead of an icon (for step lists) */
  numeral?: number
  filled?: boolean
}

export function IconDot({
  variant = 'neutral',
  size = 24,
  icon,
  numeral,
  filled = true,
}: IconDotProps) {
  const t = useTheme()
  const map = {
    success: { fg: t.colors.status.success, bg: t.colors.status.successBg },
    danger:  { fg: t.colors.status.danger,  bg: t.colors.status.dangerBg },
    warning: { fg: t.colors.status.warning, bg: t.colors.status.warningBg },
    accent:  { fg: t.colors.accent.clay,    bg: t.colors.accent.clayMuted },
    neutral: { fg: t.colors.text.tertiary,  bg: t.colors.surface.secondary },
  }[variant]
  const defaultIcon: IconSymbolName =
    variant === 'success' ? 'checkmark' :
    variant === 'danger' ? 'xmark' :
    'circle.fill'
  const showIcon = icon ?? defaultIcon
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: filled ? map.bg : 'transparent',
        borderWidth: filled ? 0 : 1,
        borderColor: map.fg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {numeral != null ? (
        <Text
          style={{
            fontFamily: 'Fraunces_700Bold',
            fontSize: Math.round(size * 0.55),
            lineHeight: Math.round(size * 0.6),
            color: map.fg,
          }}
        >
          {numeral}
        </Text>
      ) : (
        <IconSymbol name={showIcon} size={Math.round(size * 0.55)} color={map.fg} />
      )}
    </View>
  )
}
