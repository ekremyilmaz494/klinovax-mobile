import { View, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export interface DividerProps {
  inset?: number
  vertical?: boolean
  strong?: boolean
  style?: ViewStyle
}

export function Divider({ inset = 0, vertical = false, strong = false, style }: DividerProps) {
  const t = useTheme()
  const color = strong ? t.colors.border.default : t.colors.border.subtle
  if (vertical) {
    return (
      <View
        style={[
          { width: t.hairline, alignSelf: 'stretch', backgroundColor: color, marginVertical: inset },
          style,
        ]}
      />
    )
  }
  return (
    <View
      style={[{ height: t.hairline, backgroundColor: color, marginHorizontal: inset }, style]}
    />
  )
}
