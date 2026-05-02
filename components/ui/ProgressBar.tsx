import { StyleSheet, View } from 'react-native'

const TRACK = '#e2e8f0'
const PRIMARY = '#0d9668'

type Props = {
  /** 0-100 arası yüzde — sınır dışı değerler clamp'lenir. */
  value: number
  height?: number
  color?: string
}

export function ProgressBar({ value, height = 8, color = PRIMARY }: Props) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, height, borderRadius: height / 2, backgroundColor: color },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: TRACK,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    minWidth: 2,
  },
})
