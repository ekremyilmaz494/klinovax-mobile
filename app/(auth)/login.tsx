import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/auth/AuroraBackground'
import { Button, Card, Stack, Text, useTheme } from '@/design-system'
import { ApiError, loginRequest } from '@/lib/api/client'
import { isBiometricAvailable } from '@/lib/auth/biometric'
import { getBiometricEnabled, setBiometricEnabled } from '@/lib/auth/biometric-flag'
import { API_BASE_URL } from '@/lib/config'
import { useAuthStore } from '@/store/auth'

const isLocalDevApi = __DEV__ && /(^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/.test(API_BASE_URL)

export default function LoginScreen() {
  const t = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)
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
        Alert.alert(
          'Ek doğrulama gerekli',
          'Hesabınız ek doğrulama veya şifre değiştirme gerektiriyor. Mobil akış bu adımı henüz desteklemiyor; lütfen kurum yöneticinizden hesabınızın mobil girişe hazırlandığını doğrulamasını isteyin.',
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

      void offerBiometricEnable()
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = (err.body && typeof err.body === 'object' && 'error' in err.body)
          ? String((err.body as { error: unknown }).error)
          : 'Giriş başarısız.'
        setError(msg)
      } else {
        setError(`Beklenmeyen hata. (${err instanceof Error ? err.message : 'unknown'})`)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputBase = {
    backgroundColor: t.colors.surface.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: t.colors.text.primary,
    fontFamily: 'InterTight_400Regular',
    minHeight: 52,
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
              KLINOVAX
            </Text>
            <Text
              italic
              align="center"
              style={{
                fontFamily: 'Fraunces_700Bold',
                fontSize: 56,
                lineHeight: 60,
                letterSpacing: -1,
                color: t.colors.accent.clay,
              }}
            >
              Klinovax
            </Text>
            <Text variant="subhead" tone="tertiary" align="center" style={{ marginTop: 8 }}>
              Hastane Personel Eğitim Platformu
            </Text>
          </View>

          <View style={{ gap: 4 }}>
            <Text variant="caption" tone="tertiary" style={{ marginTop: 8 }}>
              E-POSTA
            </Text>
            <TextInput
              style={[
                inputBase,
                {
                  borderWidth: focused === 'email' ? 2 : StyleSheet.hairlineWidth,
                  borderColor: focused === 'email' ? t.colors.border.focus : t.colors.border.default,
                  marginTop: 4,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="ad@hastane.com"
              placeholderTextColor={t.colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              editable={!loading}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />

            <Text variant="caption" tone="tertiary" style={{ marginTop: 14 }}>
              ŞİFRE
            </Text>
            <TextInput
              style={[
                inputBase,
                {
                  borderWidth: focused === 'password' ? 2 : StyleSheet.hairlineWidth,
                  borderColor: focused === 'password' ? t.colors.border.focus : t.colors.border.default,
                  marginTop: 4,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={t.colors.text.tertiary}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              editable={!loading}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />

            <Stack direction="row" align="center" gap={3} style={{ marginTop: 16 }}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                disabled={loading}
                trackColor={{ false: t.colors.border.default, true: t.colors.accent.clay }}
                thumbColor={t.colors.surface.primary}
              />
              <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                Bu cihazda oturumumu açık tut (7 gün)
              </Text>
            </Stack>

            {error ? (
              <Text variant="footnote" tone="danger" style={{ marginTop: 12 }}>
                {error}
              </Text>
            ) : null}

            {isLocalDevApi ? (
              <Card variant="warning" rail padding={3} style={{ marginTop: 16 }}>
                <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
                  DEV — Backend kontrol
                </Text>
                <Text variant="footnote" tone="secondary">
                  API: {API_BASE_URL}{'\n'}
                  {"Sunucuya ulaşılamıyorsa: hospital-lms repo'da "}
                  <Text
                    variant="footnote"
                    style={{ fontFamily: 'Menlo', fontWeight: '600', color: t.colors.text.primary }}
                  >
                    pnpm dev
                  </Text>
                </Text>
              </Card>
            ) : null}

            <View style={{ marginTop: 24 }}>
              <Button
                label="Giriş Yap"
                variant="primary"
                size="lg"
                onPress={onSubmit}
                loading={loading}
                disabled={loading}
                fullWidth
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

async function offerBiometricEnable() {
  try {
    const [supported, alreadyOn] = await Promise.all([
      isBiometricAvailable(),
      getBiometricEnabled(),
    ])
    if (!supported || alreadyOn) return
    Alert.alert(
      'Daha hızlı giriş',
      'Bir dahaki sefere Face ID / Touch ID ile giriş yapmak ister misin? Tercihini sonra Profil ekranından da değiştirebilirsin.',
      [
        { text: 'Hayır, teşekkürler', style: 'cancel' },
        { text: 'Aç', onPress: () => void setBiometricEnabled(true) },
      ],
    )
  } catch {
    // Sessiz geç
  }
}
