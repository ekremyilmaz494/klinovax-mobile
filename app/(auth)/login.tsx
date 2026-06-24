import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  Button,
  Card,
  ContentMaxWidth,
  FontFamily,
  InputField,
  Stack,
  Text,
  useTheme,
} from '@/design-system';
import { ApiError, loginRequest } from '@/lib/api/client';
import { isBiometricAvailable } from '@/lib/auth/biometric';
import { getBiometricEnabled, setBiometricEnabled } from '@/lib/auth/biometric-flag';
import { resolveLoginStep } from '@/lib/auth/login-next-step';
import { API_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/store/auth';

const isLocalDevApi =
  __DEV__ &&
  /(^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/.test(
    API_BASE_URL,
  );

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Şifre göster/gizle — personel yazdığını doğrulayabilsin (göz ikonu).
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  // Tek giriş yolu. Yanıtın sıradaki adımı resolveLoginStep ile çözülür — gating sırası
  // backend/web ile birebir. (Tek-org politikası: çoklu-org seçimi YOK; çakışmada backend
  // 409 döner ve catch bloğu kullanıcıya mesajı gösterir.)
  const runLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('E-posta/TC Kimlik No ve şifre gereklidir.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginRequest({ email: email.trim(), password, rememberMe });
      const step = resolveLoginStep(res);
      switch (step.kind) {
        case 'mfa':
          Alert.alert(
            'Ek doğrulama gerekli',
            'Hesabınız doğrulayıcı uygulama (TOTP) ile ek doğrulama gerektiriyor. Mobil uygulama bu adımı henüz desteklemiyor; lütfen web üzerinden giriş yapın.',
          );
          return;
        case 'smsMfa':
          Alert.alert(
            'SMS doğrulaması gerekli',
            `SMS ile ek doğrulama gerekiyor${step.phoneMasked ? ` (${step.phoneMasked})` : ''}. Mobil uygulama bu adımı henüz desteklemiyor; lütfen web üzerinden giriş yapın.`,
          );
          return;
        case 'blocked':
          Alert.alert(
            'Ek doğrulama gerekli',
            'Hesabınız ek doğrulama gerektiriyor. Mobil akış bu adımı henüz desteklemiyor; lütfen kurum yöneticinizden hesabınızın mobil girişe hazırlandığını doğrulamasını isteyin.',
          );
          return;
        case 'session':
          // step.kind === 'session' → res.session kesin var; if narrow ile non-null assertion'dan kaçın.
          if (res.session) {
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
              // Zorunlu şifre değişimi → _layout overlay'i devreye girer (uygulamaya
              // girilmeden önce yeni şifre belirletilir).
              mustChangePassword: res.mustChangePassword,
            });
            // Zorunlu şifre ekranı açılacaksa biyometrik teklifini erteleme — iki modal üst üste binmesin.
            if (!res.mustChangePassword) void offerBiometricEnable();
          }
          return;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const msg =
          err.body && typeof err.body === 'object' && 'error' in err.body
            ? String((err.body as { error: unknown }).error)
            : 'Giriş başarısız.';
        setError(msg);
      } else {
        setError(`Beklenmeyen hata. (${err instanceof Error ? err.message : 'unknown'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => void runLogin();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ScrollView: küçük ekran (iPhone SE) + klavye açıkken brand+form sığmayıp
              üstten kesilmesin; içerik scroll edilebilir, dokunuşlar form'a geçer. */}
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: t.space[6],
              justifyContent: 'center',
              width: '100%',
              maxWidth: ContentMaxWidth.form,
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: 'center', marginBottom: t.space[8] }}>
              <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
                KLINOVAX
              </Text>
              <Text
                italic
                align="center"
                numberOfLines={1}
                adjustsFontSizeToFit
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
              <Text
                variant="subhead"
                tone="tertiary"
                align="center"
                style={{ marginTop: t.space[2] }}
              >
                Hastane Personel Eğitim Platformu
              </Text>
            </View>

            <View style={{ gap: t.space[1] }}>
              <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[2] }}>
                TC KİMLİK NO VEYA E-POSTA
              </Text>
              <InputField
                value={email}
                onChangeText={setEmail}
                placeholder="TC Kimlik No veya ad@hastane.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                editable={!loading}
                inputStyle={{ marginTop: t.space[1] }}
              />

              <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[4] }}>
                ŞİFRE
              </Text>
              {/* Şifre göster/gizle — personel TC/şifre yazdığını doğrulayabilsin (göz ikonu). */}
              <View style={{ position: 'relative' }}>
                <InputField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  editable={!loading}
                  inputStyle={{ marginTop: t.space[1], paddingRight: 48 }}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  disabled={loading}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    right: t.space[3],
                    top: t.space[1],
                    bottom: 0,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <IconSymbol
                    name={showPassword ? 'eye.slash' : 'eye'}
                    size={22}
                    color={t.colors.text.tertiary}
                  />
                </Pressable>
              </View>

              <Stack direction="row" align="center" gap={3} style={{ marginTop: t.space[4] }}>
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
                <Text variant="footnote" tone="danger" style={{ marginTop: t.space[3] }}>
                  {error}
                </Text>
              ) : null}

              {isLocalDevApi ? (
                <Card variant="warning" rail padding={3} style={{ marginTop: t.space[4] }}>
                  <Text
                    variant="overline"
                    style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
                  >
                    DEV — Backend kontrol
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    API: {API_BASE_URL}
                    {'\n'}
                    {"Sunucuya ulaşılamıyorsa: hospital-lms repo'da "}
                    <Text
                      variant="footnote"
                      style={{
                        fontFamily: FontFamily.mono,
                        fontWeight: '600',
                        color: t.colors.text.primary,
                      }}
                    >
                      pnpm dev
                    </Text>
                  </Text>
                </Card>
              ) : null}

              <View style={{ marginTop: t.space[6] }}>
                <Button
                  label="Giriş Yap"
                  variant="primary"
                  size="lg"
                  onPress={onSubmit}
                  loading={loading}
                  disabled={loading}
                  fullWidth
                />
                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password')}
                  disabled={loading}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    marginTop: t.space[4],
                    alignSelf: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text variant="footnote" style={{ color: t.colors.accent.clay }}>
                    Şifremi unuttum
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

async function offerBiometricEnable() {
  try {
    const [supported, alreadyOn] = await Promise.all([
      isBiometricAvailable(),
      getBiometricEnabled(),
    ]);
    if (!supported || alreadyOn) return;
    Alert.alert(
      'Daha hızlı giriş',
      'Bir dahaki sefere Face ID / Touch ID ile giriş yapmak ister misin? Tercihini sonra Profil ekranından da değiştirebilirsin.',
      [
        { text: 'Hayır, teşekkürler', style: 'cancel' },
        { text: 'Aç', onPress: () => void setBiometricEnabled(true) },
      ],
    );
  } catch {
    // Sessiz geç
  }
}
