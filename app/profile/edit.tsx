import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, InputField, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchStaffProfile, updateStaffProfile } from '@/lib/api/staff';
import { checkNewPassword, passwordStrength } from '@/lib/auth/password-policy';
import { useAuthStore } from '@/store/auth';
import type { StaffProfile } from '@/types/staff';

const STRENGTH_LABEL: Record<ReturnType<typeof passwordStrength>, string> = {
  zayif: 'Zayıf',
  orta: 'Orta',
  guclu: 'Güçlü',
};

export default function ProfileEditScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<StaffProfile, Error>({
    queryKey: ['staff', 'profile'],
    enabled: !!user,
    queryFn: fetchStaffProfile,
  });

  // ── Kişisel bilgiler ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  // Profil yüklenince alanları BİR KEZ doldur — sonraki refetch'ler kullanıcının
  // düzenlemesini ezmesin (initialized ref).
  const initialized = useRef(false);
  useEffect(() => {
    if (profile && !initialized.current) {
      initialized.current = true;
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const profileMutation = useMutation<{ success: true }, Error, void>({
    mutationFn: () =>
      updateStaffProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff', 'profile'] });
      void qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
      Alert.alert('Kaydedildi', 'Profil bilgilerin güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      Alert.alert('Kaydedilemedi', err.message || 'Profil güncellenemedi.');
    },
  });

  // ── Şifre ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const pwCheck = checkNewPassword(newPassword);
  const pwMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const passwordMutation = useMutation<{ success: true }, Error, void>({
    mutationFn: () => updateStaffProfile({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Şifre güncellendi', 'Yeni şifren kaydedildi.');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      // Backend 400'de spesifik Türkçe mesaj döner ("Mevcut şifre hatalı" vb.).
      Alert.alert('Güncellenemedi', err.message || 'Şifre güncellenemedi.');
    },
  });

  // Şifre butonu KENDİ mutation'ının pending'ine bağlı olmalı; profileMutation'a
  // bakmak, profil kaydı sürerken alakasız şekilde şifre formunu kilitliyordu.
  const canSubmitPassword =
    currentPassword.length > 0 && pwCheck.valid && pwMatch && !passwordMutation.isPending;
  // Ad/soyad boş gönderilmesin (diğer formlarla tutarlı zorunlu alan kontrolü).
  const nameValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  if (isLoading && !profile) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'Profili Düzenle' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Profili Düzenle' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[12] }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── KİŞİSEL BİLGİLER ── */}
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[3] }}>
            KİŞİSEL BİLGİLER
          </Text>

          <FieldLabel>E-posta</FieldLabel>
          <View
            style={{
              backgroundColor: t.colors.surface.secondary,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.colors.border.subtle,
              paddingHorizontal: t.space[4],
              paddingVertical: t.space[4],
            }}
          >
            <Text variant="body" tone="secondary" numberOfLines={1}>
              {profile?.email ?? user?.email ?? '—'}
            </Text>
          </View>
          <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[1] }}>
            Yönetici tarafından atanır, değiştirilemez.
          </Text>

          <FieldLabel style={{ marginTop: t.space[4] }}>Ad</FieldLabel>
          <InputField
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Adın"
            autoCapitalize="words"
            maxLength={80}
          />

          <FieldLabel style={{ marginTop: t.space[4] }}>Soyad</FieldLabel>
          <InputField
            value={lastName}
            onChangeText={setLastName}
            placeholder="Soyadın"
            autoCapitalize="words"
            maxLength={80}
          />

          <FieldLabel style={{ marginTop: t.space[4] }}>Telefon</FieldLabel>
          <InputField
            value={phone}
            onChangeText={setPhone}
            placeholder="+90 5__ ___ __ __"
            keyboardType="phone-pad"
            maxLength={20}
          />

          <View style={{ marginTop: t.space[5] }}>
            <Button
              label={profileMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              variant="primary"
              size="lg"
              onPress={() => profileMutation.mutate()}
              disabled={!nameValid || profileMutation.isPending}
              loading={profileMutation.isPending}
              fullWidth
            />
            {!nameValid ? (
              <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[2] }}>
                Ad ve soyad boş bırakılamaz.
              </Text>
            ) : null}
          </View>

          {/* ── ŞİFRE GÜNCELLE ── */}
          <Text
            variant="overline"
            tone="tertiary"
            style={{ marginTop: t.space[8], marginBottom: t.space[3] }}
          >
            ŞİFRE GÜNCELLE
          </Text>

          <FieldLabel>Mevcut şifre</FieldLabel>
          <InputField
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Mevcut şifren"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />

          <FieldLabel style={{ marginTop: t.space[4] }}>Yeni şifre</FieldLabel>
          <InputField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="En az 8 karakter"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
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

          <View style={{ marginTop: t.space[5] }}>
            <Button
              label={passwordMutation.isPending ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
              variant="primary"
              size="lg"
              onPress={() => passwordMutation.mutate()}
              disabled={!canSubmitPassword || passwordMutation.isPending}
              loading={passwordMutation.isPending}
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
