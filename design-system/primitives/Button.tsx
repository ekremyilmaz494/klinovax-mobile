import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTheme } from '../theme'
import { useReducedMotion } from '../useReducedMotion'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'md' | 'lg' | 'sm'

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  style?: ViewStyle
  accessibilityLabel?: string
  /** for outline variant — switch to danger color set */
  tone?: 'default' | 'danger'
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  iconLeft,
  iconRight,
  fullWidth,
  style,
  accessibilityLabel,
  tone = 'default',
}: ButtonProps) {
  const t = useTheme()
  const reducedMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const minHeight = size === 'sm' ? 36 : size === 'lg' ? 52 : 48
  const paddingX = size === 'sm' ? 14 : size === 'lg' ? 22 : 18

  let bg = 'transparent'
  let fg = t.colors.text.primary
  let borderColor: string | undefined
  let borderWidth = 0

  switch (variant) {
    case 'primary':
      bg = t.colors.accent.clay
      fg = t.colors.accent.clayOnAccent
      break
    case 'danger':
      bg = t.colors.status.danger
      fg = t.colors.text.onAccent
      break
    case 'ghost':
      bg = 'transparent'
      fg = tone === 'danger' ? t.colors.text.danger : t.colors.accent.clay
      break
    case 'outline':
      bg = 'transparent'
      borderWidth = 1
      borderColor = tone === 'danger' ? t.colors.text.danger : t.colors.border.default
      fg = tone === 'danger' ? t.colors.text.danger : t.colors.text.primary
      break
  }

  const isDisabled = disabled || loading

  const handlePressIn = () => {
    if (reducedMotion) return
    scale.value = withTiming(0.97, { duration: 120 })
  }
  const handlePressOut = () => {
    if (reducedMotion) return
    scale.value = withTiming(1, { duration: 160 })
  }

  return (
    <Animated.View style={[fullWidth ? { alignSelf: 'stretch' } : null, animStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={accessibilityLabel ?? label}
        hitSlop={6}
        style={({ pressed }) => ({
          minHeight,
          paddingHorizontal: paddingX,
          backgroundColor: bg,
          borderRadius: t.radius.md,
          borderWidth,
          borderColor,
          opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        })}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {iconLeft != null && <View>{iconLeft}</View>}
            <Text
              variant={size === 'sm' ? 'subhead' : 'bodyEmph'}
              style={{ color: fg, fontFamily: 'InterTight_600SemiBold' }}
            >
              {label}
            </Text>
            {iconRight != null && <View>{iconRight}</View>}
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}
