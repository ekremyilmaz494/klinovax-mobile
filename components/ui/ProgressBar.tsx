import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useReducedMotion, useTheme } from '@/design-system'

type Props = {
  /** 0-100 arası yüzde — sınır dışı değerler clamp'lenir. */
  value: number
  height?: number
  /** Override fill color (default: accent.clay) */
  color?: string
}

export function ProgressBar({ value, height = 8, color }: Props) {
  const t = useTheme()
  const reducedMotion = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, value))
  const width = useSharedValue(clamped)

  useEffect(() => {
    if (reducedMotion) {
      width.value = clamped
    } else {
      width.value = withTiming(clamped, { duration: 360 })
    }
  }, [clamped, reducedMotion, width])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }))

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: t.colors.surface.sunken,
        overflow: 'hidden',
        width: '100%',
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped), min: 0, max: 100 }}
    >
      <Animated.View
        style={[
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color ?? t.colors.accent.clay,
            minWidth: 2,
          },
          fillStyle,
        ]}
      />
    </View>
  )
}
