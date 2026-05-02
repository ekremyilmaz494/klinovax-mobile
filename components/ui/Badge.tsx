import { StyleSheet, Text, View } from 'react-native'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#f1f5f9', fg: '#475569' },
  success: { bg: '#dcfce7', fg: '#166534' },
  warning: { bg: '#fef3c7', fg: '#92400e' },
  danger:  { bg: '#fee2e2', fg: '#991b1b' },
  info:    { bg: '#dbeafe', fg: '#1e40af' },
  primary: { bg: '#d1fae5', fg: '#0d9668' },
}

type Props = {
  label: string
  tone?: Tone
}

export function Badge({ label, tone = 'neutral' }: Props) {
  const t = TONE[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '600' },
})
