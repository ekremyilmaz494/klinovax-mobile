import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  message: string
  onRetry?: () => void
}

export function ScreenError({ message, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bir sorun oluştu</Text>
      <Text style={styles.msg}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>Tekrar dene</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#991b1b' },
  msg: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6 },
  btn: {
    marginTop: 16,
    backgroundColor: '#0d9668',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
