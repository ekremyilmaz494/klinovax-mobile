import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, InputField, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { createSmgActivity, fetchSmgCategories } from '@/lib/api/smg';
import { useAuthStore } from '@/store/auth';
import type { SmgActivity, SmgCategoriesResponse } from '@/types/smg';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  // JS Date taşma tarihlerini (2026-02-30 → Mar 2) bazı engine'lerde sessizce
  // kaydırır; round-trip ile gerçek takvim tarihi olduğunu doğrula (engine'den bağımsız).
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export default function SmgAddScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: catData, isLoading: catLoading } = useQuery<SmgCategoriesResponse, Error>({
    queryKey: ['smg-categories'],
    enabled: !!user,
    queryFn: fetchSmgCategories,
  });
  const categories = useMemo(() => catData?.categories ?? [], [catData]);

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [completionDate, setCompletionDate] = useState(todayIso());
  const [points, setPoints] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');

  const selectedCat = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const maxPoints = selectedCat?.maxPointsPerActivity ?? null;

  const pointsNum = Number(points);
  const pointsValid =
    points.trim() !== '' &&
    Number.isInteger(pointsNum) &&
    pointsNum >= 1 &&
    pointsNum <= 999 &&
    (maxPoints == null || pointsNum <= maxPoints);
  // Tamamlanma tarihi gelecekte olamaz (ISO string karşılaştırması leksikografik = kronolojik).
  const dateValid = isValidIsoDate(completionDate) && completionDate <= todayIso();
  const urlValid = certificateUrl.trim() === '' || certificateUrl.trim().startsWith('https://');

  const mutation = useMutation<SmgActivity, Error, void>({
    mutationFn: () =>
      createSmgActivity({
        categoryId,
        title: title.trim(),
        provider: provider.trim() || undefined,
        completionDate,
        smgPoints: pointsNum,
        certificateUrl: certificateUrl.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['smg-points'] });
      Alert.alert('Eklendi', 'Aktiviten kaydedildi, onay için yöneticine iletildi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      // Backend 400/404'te spesifik Türkçe mesaj döner (max puan / kategori vb.).
      Alert.alert('Eklenemedi', err.message || 'Aktivite eklenemedi.');
    },
  });

  const canSubmit =
    categoryId !== '' &&
    title.trim().length >= 2 &&
    dateValid &&
    pointsValid &&
    urlValid &&
    !mutation.isPending;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Aktivite Ekle' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[12] }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Label t={t}>Kategori</Label>
          {catLoading && categories.length === 0 ? (
            <ActivityIndicator color={t.colors.accent.clay} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          )}

          <Label t={t} style={{ marginTop: t.space[5] }}>
            Başlık
          </Label>
          <InputField
            value={title}
            onChangeText={setTitle}
            placeholder="Aktivite başlığı (en az 2 karakter)"
            maxLength={255}
          />

          <Label t={t} style={{ marginTop: t.space[4] }}>
            Sağlayıcı (opsiyonel)
          </Label>
          <InputField
            value={provider}
            onChangeText={setProvider}
            placeholder="Düzenleyen kurum / kuruluş"
            maxLength={255}
          />

          <Label t={t} style={{ marginTop: t.space[4] }}>
            Tamamlanma tarihi
          </Label>
          <InputField
            value={completionDate}
            onChangeText={setCompletionDate}
            placeholder="YYYY-AA-GG"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCapitalize="none"
          />
          {!dateValid ? (
            <Text
              variant="caption"
              style={{ marginTop: t.space[1], color: t.colors.status.danger }}
            >
              Geçerli bir tarih gir (YYYY-AA-GG).
            </Text>
          ) : null}

          <Label t={t} style={{ marginTop: t.space[4] }}>
            Puan
            {maxPoints != null ? (
              <Text variant="caption" tone="tertiary">
                {'  '}(en fazla {maxPoints})
              </Text>
            ) : null}
          </Label>
          <InputField
            value={points}
            onChangeText={(v) => setPoints(v.replace(/[^0-9]/g, ''))}
            placeholder="1–999"
            keyboardType="number-pad"
            maxLength={3}
          />

          <Label t={t} style={{ marginTop: t.space[4] }}>
            Sertifika URL (opsiyonel)
          </Label>
          <InputField
            value={certificateUrl}
            onChangeText={setCertificateUrl}
            placeholder="https://…"
            keyboardType="url"
            autoCapitalize="none"
          />
          {!urlValid ? (
            <Text
              variant="caption"
              style={{ marginTop: t.space[1], color: t.colors.status.danger }}
            >
              URL https:// ile başlamalı.
            </Text>
          ) : null}

          <View style={{ marginTop: t.space[6] }}>
            <Button
              label={mutation.isPending ? 'Ekleniyor…' : 'Aktivite Ekle'}
              variant="primary"
              size="lg"
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              loading={mutation.isPending}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({
  t,
  children,
  style,
}: {
  t: ReturnType<typeof useTheme>;
  children: React.ReactNode;
  style?: import('react-native').StyleProp<import('react-native').TextStyle>;
}) {
  return (
    <Text variant="subhead" tone="tertiary" style={[{ marginBottom: t.space[2] }, style]}>
      {children}
    </Text>
  );
}
