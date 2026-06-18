import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack as ExpoStack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Chip, InputField, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { createKvkkRequest, fetchKvkkRequests } from '@/lib/api/kvkk';
import { useAuthStore } from '@/store/auth';
import type {
  CreateKvkkRequestResponse,
  KvkkRequest,
  KvkkRequestsResponse,
  KvkkRequestType,
  KvkkStatus,
} from '@/types/kvkk';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TYPE_ORDER: KvkkRequestType[] = [
  'access',
  'detail',
  'purpose',
  'third_party',
  'correction',
  'deletion',
  'notification',
  'objection',
  'damage',
];

const TYPE_LABELS: Record<KvkkRequestType, string> = {
  access: 'Verilerim işleniyor mu?',
  detail: 'İşlenen verilerim hakkında bilgi',
  purpose: 'İşlenme amacı',
  third_party: 'Üçüncü kişilere aktarım',
  correction: 'Düzeltme',
  deletion: 'Silme / yok etme',
  notification: 'Düzeltme/silmenin bildirilmesi',
  objection: 'Otomatik karara itiraz',
  damage: 'Zararın giderilmesi',
};

const STATUS_META: Record<KvkkStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Beklemede', tone: 'info' },
  in_progress: { label: 'İnceleniyor', tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'success' },
  rejected: { label: 'Reddedildi', tone: 'danger' },
};

const MIN_DESC = 10;
const MAX_DESC = 2000;

export default function KvkkScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<KvkkRequestsResponse, Error>({
    queryKey: ['kvkk-requests'],
    enabled: !!user,
    queryFn: fetchKvkkRequests,
  });

  const [selectedType, setSelectedType] = useState<KvkkRequestType | null>(null);
  const [description, setDescription] = useState('');

  const mutation = useMutation<CreateKvkkRequestResponse, Error, void>({
    mutationFn: () => {
      if (!selectedType) throw new Error('Talep türü seçilmedi');
      return createKvkkRequest({ requestType: selectedType, description: description.trim() });
    },
    onSuccess: () => {
      setSelectedType(null);
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['kvkk-requests'] });
      Alert.alert(
        'Talebin alındı',
        'KVKK hak talebin kaydedildi. Yasal süre içinde (30 gün) değerlendirilecek.',
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert('Bekleyen talep var', 'Bu türde sonuçlanmamış bir talebin zaten mevcut.');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Çok sık denedin', 'Kısa bir süre sonra tekrar dene.');
        return;
      }
      Alert.alert('Gönderilemedi', err.message);
    },
  });

  const trimmedLen = description.trim().length;
  const canSubmit = selectedType !== null && trimmedLen >= MIN_DESC && !mutation.isPending;

  if (isLoading && !data) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'KVKK Veri Haklarım' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
        <ExpoStack.Screen options={{ title: 'KVKK Veri Haklarım' }} />
        <ScreenError
          message={error.message || 'Talepler yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const requests = data?.requests ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'KVKK Veri Haklarım' }} />
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
          <Text variant="body" tone="secondary">
            6698 sayılı KVKK kapsamında kişisel verilerinle ilgili talep oluşturabilirsin. Talebin
            yasal süre içinde (30 gün) değerlendirilir.
          </Text>

          {/* ── Yeni talep formu ── */}
          <Text
            variant="overline"
            tone="tertiary"
            style={{ marginTop: t.space[6], marginBottom: t.space[3] }}
          >
            YENİ TALEP
          </Text>

          <Text variant="subhead" tone="tertiary" style={{ marginBottom: t.space[2] }}>
            Talep türü
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
            {TYPE_ORDER.map((type) => (
              <Chip
                key={type}
                label={TYPE_LABELS[type]}
                selected={selectedType === type}
                onPress={() => setSelectedType((cur) => (cur === type ? null : type))}
                accessibilityLabel={`Talep türü: ${TYPE_LABELS[type]}`}
              />
            ))}
          </View>

          <Text
            variant="subhead"
            tone="tertiary"
            style={{ marginTop: t.space[5], marginBottom: t.space[2] }}
          >
            Açıklama
          </Text>
          <InputField
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={MAX_DESC}
            placeholder="Talebini ayrıntılı açıkla (en az 10 karakter)…"
            inputStyle={{ minHeight: 120, fontSize: 15, lineHeight: 22 }}
          />
          <Stack direction="row" justify="space-between" style={{ marginTop: t.space[2] }}>
            <Text variant="caption" tone="tertiary">
              {trimmedLen < MIN_DESC ? `En az ${MIN_DESC} karakter` : ' '}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
              {description.length}/{MAX_DESC}
            </Text>
          </Stack>

          <View style={{ marginTop: t.space[4] }}>
            <Button
              label={mutation.isPending ? 'Gönderiliyor…' : 'Talep oluştur'}
              variant="primary"
              size="lg"
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              loading={mutation.isPending}
              fullWidth
            />
          </View>

          {/* ── Talep listesi ── */}
          <Text
            variant="overline"
            tone="tertiary"
            style={{ marginTop: t.space[8], marginBottom: t.space[3] }}
          >
            TALEPLERİM
          </Text>
          {requests.length === 0 ? (
            <EmptyState
              icon="doc.text"
              title="Henüz talebin yok"
              description="Yukarıdan yeni bir KVKK hak talebi oluşturabilirsin."
            />
          ) : (
            <View style={{ gap: t.space[3] }}>
              {requests.map((req) => (
                <RequestCard key={req.id} req={req} t={t} />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RequestCard({ req, t }: { req: KvkkRequest; t: ReturnType<typeof useTheme> }) {
  const status = STATUS_META[req.status] ?? { label: req.status, tone: 'neutral' as Tone };
  const created = new Date(req.createdAt).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: t.space[4],
      }}
    >
      <Stack direction="row" justify="space-between" align="center" gap={3}>
        <Text variant="bodyEmph" style={{ flex: 1 }} numberOfLines={2}>
          {TYPE_LABELS[req.requestType] ?? req.requestType}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </Stack>
      <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[1] }}>
        {created}
      </Text>
      <Text variant="footnote" tone="secondary" style={{ marginTop: t.space[3] }}>
        {req.description}
      </Text>
      {req.responseNote ? (
        <View
          style={{
            marginTop: t.space[3],
            backgroundColor: t.colors.surface.secondary,
            borderRadius: t.radius.md,
            padding: t.space[3],
          }}
        >
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[1] }}>
            KURUM YANITI
          </Text>
          <Text variant="footnote" tone="secondary">
            {req.responseNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
