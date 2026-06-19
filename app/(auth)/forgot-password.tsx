import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/components/auth/AuroraBackground';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, InputField, Text, useTheme } from '@/design-system';
import { requestPasswordReset } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

/**
 * "Şifremi unuttum" — yalnızca sıfırlama e-postasını TETİKLER. Backend güvenlik
 * gereği e-posta var/yok ayrımı yapmadan her zaman başarı döner; sıfırlama linki
 * web tarayıcısında açılır (Supabase reset akışı mobil-içi tamamlanamaz).
 */
export default function ForgotPasswordScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation<unknown, Error, void>({
    mutationFn: () => requestPasswordReset(email.trim()),
    onSuccess: () => setSent(true),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        setError('Çok fazla istek gönderdin. Lütfen biraz sonra tekrar dene.');
        return;
      }
      setError(err.message || 'İstek gönderilemedi. Lütfen tekrar dene.');
    },
  });

  const onSubmit = () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Geçerli bir e-posta adresi gir.');
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: t.space[3], paddingTop: t.space[2] }}>
          <HeaderBackButton label="Giriş" />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: t.space[6], justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sent ? (
              <View style={{ alignItems: 'center', gap: t.space[3] }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: t.colors.status.successBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={32}
                    color={t.colors.status.success}
                  />
                </View>
                <Text variant="title-2" align="center">
                  E-postanı kontrol et
                </Text>
                <Text variant="subhead" tone="tertiary" align="center">
                  Eğer bu adrese kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.
                  Bağlantı web tarayıcısında açılır.
                </Text>
                <View style={{ marginTop: t.space[4], alignSelf: 'stretch' }}>
                  <Button
                    label="Giriş ekranına dön"
                    variant="primary"
                    size="lg"
                    onPress={() => router.back()}
                    fullWidth
                  />
                </View>
              </View>
            ) : (
              <>
                <Text variant="title-1">Şifreni mi unuttun?</Text>
                <Text variant="subhead" tone="tertiary" style={{ marginTop: t.space[2] }}>
                  Hesabının e-posta adresini gir; sana bir şifre sıfırlama bağlantısı gönderelim.
                </Text>

                <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[6] }}>
                  E-POSTA
                </Text>
                <InputField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ad@hastane.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="username"
                  editable={!mutation.isPending}
                  inputStyle={{ marginTop: t.space[1] }}
                />

                {error ? (
                  <Text variant="footnote" tone="danger" style={{ marginTop: t.space[3] }}>
                    {error}
                  </Text>
                ) : null}

                <View style={{ marginTop: t.space[6] }}>
                  <Button
                    label="Sıfırlama bağlantısı gönder"
                    variant="primary"
                    size="lg"
                    onPress={onSubmit}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                    fullWidth
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
