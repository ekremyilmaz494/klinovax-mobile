import { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ApiError, loginRequest } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const DANGER = '#dc2626'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setSession = useAuthStore((s) => s.setSession)

  const onSubmit = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gereklidir.')
      return
    }
    setLoading(true)
    try {
      const res = await loginRequest({ email: email.trim(), password, rememberMe })
      if (!res.session) {
        // MFA / SMS-MFA / şifre değiştirme akışı sunucudan geliyorsa session null kalır.
        // Hafta 1'de bu akışlar UI olarak yok — kullanıcıyı bilgilendir.
        Alert.alert(
          'Ek doğrulama gerekli',
          'Hesabınız MFA / SMS doğrulama gerektiriyor. Bu adım mobilde henüz hazır değil — şimdilik web tarafından girip MFA\'yı kapatın.',
        )
        return
      }
      await setSession({
        accessToken: res.session.accessToken,
        refreshToken: res.session.refreshToken,
        user: {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role as 'staff' | 'admin' | 'super_admin',
          organizationId: res.organizationId,
          organizationSlug: res.organizationSlug,
        },
      })
      // _layout AuthGate yönlendirecek
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = (err.body && typeof err.body === 'object' && 'error' in err.body)
          ? String((err.body as { error: unknown }).error)
          : 'Giriş başarısız.'
        setError(msg)
      } else {
        setError('Bağlantı hatası. Tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.brand}>Klinovax</Text>
          <Text style={styles.subtitle}>Hastane Personel Eğitim</Text>

          <View style={styles.form}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ad@hastane.com"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.row}>
              <Switch value={rememberMe} onValueChange={setRememberMe} disabled={loading} />
              <Text style={styles.rowLabel}>Bu cihazda oturumumu açık tut (7 gün)</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: { fontSize: 36, fontWeight: '700', color: PRIMARY, textAlign: 'center' },
  subtitle: { fontSize: 15, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 32 },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: FG, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: FG,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  rowLabel: { flex: 1, fontSize: 14, color: FG },
  error: { color: DANGER, fontSize: 14, marginTop: 8 },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
})
