// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolWeight, SymbolViewProps } from 'expo-symbols'
import { ComponentProps } from 'react'
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native'

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>
export type IconSymbolName = keyof typeof MAPPING

/**
 * SF Symbols → Material Icons mapping.
 * iOS uses SF Symbols natively (see icon-symbol.ios.tsx); this file is for Android/web only.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'book.fill': 'book',
  rosette: 'workspace-premium',
  'person.fill': 'person',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  xmark: 'close',
  'xmark.circle.fill': 'cancel',
  'circle.fill': 'circle',
  circle: 'radio-button-unchecked',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'doc.text': 'description',
  'doc.fill': 'picture-as-pdf',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'speaker.slash.fill': 'volume-off',
  'speaker.wave.2.fill': 'volume-up',
  'lock.fill': 'lock',
  faceid: 'face',
  touchid: 'fingerprint',
  'bell.fill': 'notifications',
  bell: 'notifications-none',
  'square.and.arrow.up': 'share',
  eye: 'visibility',
  'exclamationmark.triangle.fill': 'warning',
  tray: 'inbox',
  clock: 'schedule',
  'calendar': 'calendar-today',
  'graduationcap.fill': 'school',
  'star.fill': 'star',
  gear: 'settings',
} as IconMapping

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName
  size?: number
  color: string | OpaqueColorValue
  style?: StyleProp<TextStyle>
  weight?: SymbolWeight
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />
}
