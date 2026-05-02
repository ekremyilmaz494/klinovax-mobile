import { StyleSheet, Text, View } from 'react-native'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<Tone, { bg: string; fg: string; label: string }> = {
  default: { bg: '#fff', fg: '#0f172a', label: '#64748b' },
  success: { bg: '#ecfdf5', fg: '#047857', label: '#065f46' },
  warning: { bg: '#fffbeb', fg: '#b45309', label: '#92400e' },
  danger:  { bg: '#fef2f2', fg: '#b91c1c', label: '#991b1b' },
  info:    { bg: '#eff6ff', fg: '#1d4ed8', label: '#1e40af' },
}

type Props = {
  label: string
  value: number | string
  tone?: Tone
}

export function StatCard({ label, value, tone = 'default' }: Props) {
  const t = TONE[tone]
  return (
    <View style={[styles.card, { backgroundColor: t.bg }]}>
      <Text style={[styles.value, { color: t.fg }]}>{value}</Text>
      <Text style={[styles.label, { color: t.label }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  value: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 4, fontWeight: '500' },
})
