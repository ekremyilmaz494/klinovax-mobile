import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuthStore } from '@/store/auth'

const PRIMARY = '#0d9668'
const DANGER = '#dc2626'

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>E-posta</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>{user?.role ?? '—'}</Text>
          <Text style={styles.label}>Hastane</Text>
          <Text style={styles.value}>{user?.organizationSlug ?? user?.organizationId ?? '—'}</Text>
        </View>

        <Pressable style={styles.logoutBtn} onPress={() => void logout()}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { flex: 1, padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  label: { fontSize: 13, color: '#64748b', marginTop: 12 },
  value: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DANGER,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: DANGER, fontSize: 16, fontWeight: '600' },
})
