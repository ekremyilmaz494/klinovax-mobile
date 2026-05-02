import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useAuthStore } from '@/store/auth'

/**
 * Root index — auth durumuna göre login'e ya da dashboard'a yönlendir.
 * `_layout.tsx`'teki AuthGate hydrate sonrası segments-based redirect yapar;
 * burada ilk frame için splash görevi gören yönlendirici.
 */
export default function Index() {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0d9668" size="large" />
      </View>
    )
  }
  return <Redirect href={user ? '/(tabs)/dashboard' : '/(auth)/login'} />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
})
