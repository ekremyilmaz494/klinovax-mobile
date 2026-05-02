import { StyleSheet, Text, View } from 'react-native'

type Props = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#475569', textAlign: 'center' },
  desc: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
})
