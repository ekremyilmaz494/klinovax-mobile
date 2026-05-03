import { View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export type TagTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface TagProps {
  label: string
  tone?: TagTone
  outlined?: boolean
  style?: ViewStyle
}

export function Tag({ label, tone = 'neutral', outlined = false, style }: TagProps) {
  const t = useTheme()
  const map: Record<TagTone, { fg: string; bg: string }> = {
    primary: { fg: t.colors.accent.clay, bg: t.colors.accent.clayMuted },
    success: { fg: t.colors.status.success, bg: t.colors.status.successBg },
    warning: { fg: t.colors.status.warning, bg: t.colors.status.warningBg },
    danger:  { fg: t.colors.status.danger, bg: t.colors.status.dangerBg },
    info:    { fg: t.colors.status.info, bg: t.colors.status.infoBg },
    neutral: { fg: t.colors.text.secondary, bg: t.colors.surface.secondary },
  }
  const { fg, bg } = map[tone]
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: t.radius.pill,
          backgroundColor: outlined ? 'transparent' : bg,
          borderWidth: outlined ? 1 : 0,
          borderColor: fg,
        },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  )
}
