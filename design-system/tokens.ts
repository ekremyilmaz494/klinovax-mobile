import { StyleSheet } from 'react-native'

export const Palette = {
  sand:    { 50: '#FBF8F2', 100: '#F5F1EA', 200: '#ECE5D7', 300: '#DDD2BB' },
  ink:     { 900: '#1B1A17', 800: '#2A2825', 700: '#3F3B36', 600: '#5C5750' },
  stone:   { 500: '#78716C', 400: '#9A938B', 300: '#BDB6AD', 200: '#D9D3C9' },
  clay:    { 700: '#9A340A', 600: '#C2410C', 500: '#D9531C', 400: '#E07A45', 300: '#F2C2A0' },
  sage:    { 700: '#3D5F33', 600: '#4F7942', 500: '#6E9560', 400: '#9BC58E', 200: '#CFE0C5' },
  ember:   { 700: '#911818', 600: '#B91C1C', 500: '#D33B3B', 400: '#F0A6A6', 200: '#F2C9C9' },
  amber:   { 700: '#92400E', 600: '#B45309', 500: '#D97706', 400: '#E5B070', 200: '#FCE7B6' },
  night:   { 900: '#15130F', 800: '#1F1C17', 700: '#2A2620', 600: '#3A352C' },
  parchment:{ 50: '#F0E9DA', 200: '#C7BFAF', 400: '#928979' },
} as const

export const Radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const Space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const Hairline = StyleSheet.hairlineWidth

/**
 * Warm Editorial estetiği gölge yerine hairline border kullanır. Daha sonra
 * gölge gerekirse tema-bilinçli olmalı (dark mode'da ink-900 koyu surface
 * üzerinde görünmez); o yüzden burada static `card`/`raised` token tutmuyoruz.
 */
export const Shadow = {
  none: {},
} as const

export const Motion = {
  duration: { instant: 120, fast: 180, base: 240, slow: 360 },
} as const
