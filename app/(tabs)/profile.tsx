import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, Stack, Text, useTheme } from '@/design-system';
import { apiFetch } from '@/lib/api/client';
import { isBiometricAvailable, promptBiometric } from '@/lib/auth/biometric';
import { getBiometricEnabled, setBiometricEnabled } from '@/lib/auth/biometric-flag';
import { setLastUnlockAt } from '@/lib/auth/biometric-policy';
import { useAuthStore } from '@/store/auth';

type StaffProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hospital: string;
  department: string;
  title: string;
  avatarUrl: string;
  stats: { assignments: number; exams: number; certificates: number };
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  staff: 'Personel',
  admin: 'Yönetici',
  super_admin: 'Süper Yönetici',
};

export default function ProfileScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useQuery<StaffProfile, Error>({
    queryKey: ['staff', 'profile'],
    enabled: !!user,
    queryFn: () => apiFetch<StaffProfile>('/api/staff/profile'),
  });

  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [toggling, setToggling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [supported, enabled] = await Promise.all([
          isBiometricAvailable(),
          getBiometricEnabled(),
        ]);
        if (cancelled) return;
        setBiometricSupported(supported);
        setBiometricEnabledState(enabled);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onToggleBiometric = async (next: boolean) => {
    if (toggling) return;
    setToggling(true);
    const supported = await isBiometricAvailable();
    setBiometricSupported(supported);
    if (!supported) {
      Alert.alert(
        'Biyometrik kullanılamıyor',
        Platform.OS === 'ios'
          ? 'Cihazında Face ID veya Touch ID kayıtlı değil.\n\n• Gerçek cihaz: Ayarlar > Face ID ve Parola üzerinden kayıt yap.\n• Simulator: üst menü → Features > Face ID > Enrolled işaretli olmalı.'
          : 'Cihazında parmak izi veya yüz tanıma kayıtlı değil. Ayarlar > Güvenlik üzerinden kayıt yap.',
      );
      setToggling(false);
      return;
    }

    if (next) {
      const ok = await promptBiometric('Biyometrik girişi etkinleştirmek için kimliğini doğrula');
      if (!ok) {
        setToggling(false);
        return;
      }
      try {
        await setBiometricEnabled(true);
        await setLastUnlockAt(Date.now());
        setBiometricEnabledState(true);
      } catch {
        Alert.alert('Hata', 'Tercih kaydedilemedi.');
      } finally {
        setToggling(false);
      }
      return;
    }
    try {
      await setBiometricEnabled(false);
      setBiometricEnabledState(false);
    } catch {
      Alert.alert('Hata', 'Tercih kaydedilemedi.');
    } finally {
      setToggling(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Çıkış yap', 'Oturumunu kapatmak istediğinden emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email
    : (user?.email ?? '—');

  const initials = profile
    ? buildInitials(profile.firstName, profile.lastName, profile.email)
    : buildInitials('', '', user?.email ?? '');

  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : '—';
  const appVersion = Constants.expoConfig?.version ?? Constants.expoConfig?.runtimeVersion ?? '—';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Stack direction="row" align="center" gap={4} style={{ marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: t.colors.accent.clay,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Fraunces_700Bold',
                fontSize: 22,
                color: t.colors.accent.clayOnAccent,
                letterSpacing: 0.5,
              }}
            >
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title-2" numberOfLines={1}>
              {fullName}
            </Text>
            <Text variant="subhead" tone="tertiary" numberOfLines={1}>
              {profile?.title || roleLabel}
              {profile?.hospital ? ` · ${profile.hospital}` : ''}
            </Text>
          </View>
        </Stack>

        {profileLoading && !profile ? (
          <View
            style={{
              backgroundColor: t.colors.surface.primary,
              borderRadius: t.radius.lg,
              borderWidth: t.hairline,
              borderColor: t.colors.border.subtle,
              paddingVertical: 28,
              alignItems: 'center',
            }}
          >
            <ActivityIndicator color={t.colors.accent.clay} />
          </View>
        ) : profile ? (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: t.colors.surface.primary,
              borderRadius: t.radius.lg,
              borderWidth: t.hairline,
              borderColor: t.colors.border.subtle,
              paddingVertical: 18,
            }}
          >
            <StatCol label="Atama" value={profile.stats.assignments} />
            <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
            <StatCol label="Sınav" value={profile.stats.exams} />
            <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
            <StatCol label="Sertifika" value={profile.stats.certificates} />
          </View>
        ) : null}

        <SectionTitle>Hesap Bilgileri</SectionTitle>
        <Card>
          <InfoRow label="E-posta" value={profile?.email ?? user?.email ?? '—'} />
          <InfoRow label="Telefon" value={profile?.phone || '—'} />
          <InfoRow label="Departman" value={profile?.department || '—'} />
          <InfoRow label="Unvan" value={profile?.title || roleLabel} last />
        </Card>

        <SectionTitle>Güvenlik</SectionTitle>
        <Card>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyEmph">Biyometrik ile giriş</Text>
              <Text variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
                {biometricSupported
                  ? 'Uygulamayı her açtığında Face ID / Touch ID ile doğrula.'
                  : 'Cihazında biyometrik kayıtlı değil — Ayarlar > Face ID/Touch ID üzerinden ekle.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={onToggleBiometric}
              disabled={toggling}
              trackColor={{ true: t.colors.accent.clay, false: t.colors.border.default }}
              thumbColor={t.colors.surface.primary}
            />
          </View>
        </Card>

        <SectionTitle>Yasal</SectionTitle>
        <Card>
          <LinkRow label="KVKK Aydınlatma Metni" onPress={() => router.push('/legal/kvkk')} />
          <LinkRow label="Kullanım Koşulları" onPress={() => router.push('/legal/terms')} />
          <LinkRow label="Gizlilik Politikası" onPress={() => router.push('/legal/privacy')} last />
        </Card>

        <SectionTitle>Hakkında</SectionTitle>
        <Card>
          <InfoRow label="Sürüm" value={`${appVersion}`} last />
        </Card>

        <View style={{ marginTop: 24 }}>
          <Button
            label="Çıkış Yap"
            variant="outline"
            tone="danger"
            size="lg"
            onPress={onLogout}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      variant="overline"
      tone="tertiary"
      style={{ marginTop: 24, marginBottom: 10, marginLeft: 4 }}
    >
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        paddingHorizontal: 16,
      }}
    >
      {children}
    </View>
  );
}

function StatCol({ label, value }: { label: string; value: number }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Text
        style={{
          fontFamily: 'Fraunces_700Bold',
          fontSize: 26,
          lineHeight: 30,
          color: t.colors.text.primary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.border.subtle,
        gap: 12,
      }}
    >
      <Text variant="subhead" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyEmph" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: t.colors.border.subtle,
          opacity: pressed ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Text variant="callout" style={{ flex: 1 }}>
        {label}
      </Text>
      <IconSymbol name="chevron.right" size={18} color={t.colors.text.tertiary} />
    </Pressable>
  );
}

function buildInitials(firstName: string, lastName: string, email: string): string {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  const at = email.indexOf('@');
  const base = at > 0 ? email.slice(0, at) : email;
  return (base[0] ?? '?').toUpperCase();
}
