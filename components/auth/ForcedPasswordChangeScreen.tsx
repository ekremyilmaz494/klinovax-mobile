import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, InputField, Stack, Text, useTheme } from '@/design-system';
import { changePassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { checkNewPassword, passwordStrength } from '@/lib/auth/password-policy';
import { useAuthStore } from '@/store/auth';

const STRENGTH_LABEL = { zayif: 'Zayıf', orta: 'Orta', guclu: 'Güçlü' } as const;

/**
 * Tüm ekranların ÜZERİNE binen tam ekran zorunlu şifre değişimi. Backend "ilk
 * girişte şifre değiştir" işaretlediğinde (`mustChangePassword`) _layout tarafında,
 * biyometrik kilit GEÇİLDİKTEN sonra render edilir. Logout dışında atlanamaz —
 * başarılı değişim `clearMustChange()` ile overlay'i kaldırır.
 *
 * `/api/auth/change-password` endpoint'i mevcut şifreyi doğrular, yenisini yazar ve
 * `mustChangePassword` bayrağını sunucuda da temizler.
 */
export function ForcedPasswordChangeScreen() {
  const t = useTheme();
  const clearMustChange = useAuthStore((s) => s.clearMustChange);
  const logout = useAuthStore((s) => s.logout);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const pwCheck = checkNewPassword(newPassword);
  const pwMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const mutation = useMutation<{ message: string }, Error, void>({
    mutationFn: () => changePassword({ currentPassword, newPassword, confirmPassword }),
    onSuccess: async () => {
      await clearMustChange();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      // Backend 400'de spesifik mesaj döner ("Mevcut şifre hatalı" / "Şifreler eşleşmiyor").
      Alert.alert('Güncellenemedi', err.message || 'Şifre güncellenemedi.');
    },
  });

  const canSubmit = currentPassword.length > 0 && pwCheck.valid && pwMatch && !mutation.isPending;

  return (
    <SafeAreaView
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: t.colors.surface.canvas, zIndex: 998 },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: t.space[6], justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="overline" tone="tertiary">
            GÜVENLİK
          </Text>
          <Text variant="title-1" style={{ marginTop: t.space[1] }}>
            Şifreni belirle
          </Text>
          <Text variant="subhead" tone="tertiary" style={{ marginTop: t.space[2] }}>
            Devam etmeden önce hesabın için yeni bir şifre belirlemen gerekiyor.
          </Text>

          <FieldLabel style={{ marginTop: t.space[6] }}>Mevcut şifre</FieldLabel>
          <InputField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Giriş yaptığın şifre"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!mutation.isPending}
          />

          <FieldLabel style={{ marginTop: t.space[4] }}>Yeni şifre</FieldLabel>
          <InputField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="En az 8 karakter"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!mutation.isPending}
          />
          <Stack direction="row" justify="space-between" style={{ marginTop: t.space[2] }}>
            <Text
              variant="caption"
              style={{
                color:
                  newPassword.length === 0 || pwCheck.valid
                    ? t.colors.text.tertiary
                    : t.colors.status.danger,
              }}
            >
              En az 8 karakter, bir büyük harf ve bir rakam
            </Text>
            {newPassword.length > 0 ? (
              <Text variant="caption" tone="tertiary">
                Güç: {STRENGTH_LABEL[passwordStrength(newPassword)]}
              </Text>
            ) : null}
          </Stack>

          <FieldLabel style={{ marginTop: t.space[4] }}>Yeni şifre (tekrar)</FieldLabel>
          <InputField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Yeni şifreyi tekrar gir"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!mutation.isPending}
          />
          {confirmPassword.length > 0 ? (
            <Text
              variant="caption"
              style={{
                marginTop: t.space[1],
                color: pwMatch ? t.colors.status.success : t.colors.status.danger,
              }}
            >
              {pwMatch ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}
            </Text>
          ) : null}

          <View style={{ marginTop: t.space[6], gap: t.space[3] }}>
            <Button
              label={mutation.isPending ? 'Kaydediliyor…' : 'Şifreyi Belirle'}
              variant="primary"
              size="lg"
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              loading={mutation.isPending}
              fullWidth
            />
            <Button
              label="Çıkış Yap"
              variant="ghost"
              onPress={() => void logout()}
              disabled={mutation.isPending}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({
  children,
  style,
}: {
  children: string;
  style?: import('react-native').StyleProp<import('react-native').TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text variant="subhead" tone="tertiary" style={[{ marginBottom: t.space[2] }, style]}>
      {children}
    </Text>
  );
}
