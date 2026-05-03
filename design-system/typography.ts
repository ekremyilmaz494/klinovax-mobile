import type { TextStyle } from 'react-native'
import { FontFamily } from './fonts'

export type TypeVariant =
  | 'display'
  | 'title-1'
  | 'title-2'
  | 'title-3'
  | 'headline'
  | 'body'
  | 'bodyEmph'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline'
  | 'mono'
  | 'metric'
  | 'metricSmall'

export const Type: Record<TypeVariant, TextStyle> = {
  display: {
    fontFamily: FontFamily.displayBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  'title-1': {
    fontFamily: FontFamily.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  'title-2': {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  'title-3': {
    fontFamily: FontFamily.display,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  headline: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyEmph: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  callout: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  subhead: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  overline: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  metric: {
    fontFamily: FontFamily.displayBold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  metricSmall: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
}
