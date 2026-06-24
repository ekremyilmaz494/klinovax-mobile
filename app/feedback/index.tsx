import { useQuery } from '@tanstack/react-query';
import { Stack as ExpoStack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchPendingFeedback } from '@/lib/api/feedback';
import { useAuthStore } from '@/store/auth';
import type { PendingFeedbackItem, PendingFeedbackResponse } from '@/types/feedback';

/**
 * Bekleyen geri bildirimlerin tam listesi — ZORUNLU + ÖNERİLEN. Dashboard banner'ı
 * yalnız ilk zorunlu öğeyi gösterdiği için opsiyonel/önerilen geri bildirim
 * yalnızca burada keşfedilebilir. `['pending-feedback']` key banner ile paylaşımlı.
 */
export default function FeedbackListScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<PendingFeedbackResponse, Error>({
    queryKey: ['pending-feedback'],
    enabled: !!user,
    queryFn: fetchPendingFeedback,
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <Shell t={t}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </Shell>
    );
  }

  if (error && !data) {
    return (
      <Shell t={t}>
        <ScreenError
          message={error.message || 'Geri bildirimler yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  const items = data?.formActive ? (data?.items ?? []) : [];
  const mandatory = items.filter((it) => it.isMandatory);
  const optional = items.filter((it) => !it.isMandatory);

  return (
    <Shell t={t}>
      <ScrollView
        contentContainerStyle={{
          padding: t.space[4],
          paddingBottom: t.space[12],
          width: '100%',
          maxWidth: ContentMaxWidth.content,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent.clay}
          />
        }
      >
        {items.length === 0 ? (
          <View style={{ paddingTop: t.space[16] }}>
            <EmptyState
              icon="checkmark.seal.fill"
              title="Bekleyen geri bildirim yok"
              description="Bir eğitim için geri bildirim istendiğinde burada listelenecek."
            />
          </View>
        ) : (
          <View style={{ gap: t.space[6] }}>
            {mandatory.length > 0 ? (
              <Section
                t={t}
                label="ZORUNLU"
                hint="Bunlar doldurulmadan yeni eğitim başlatamazsın."
                items={mandatory}
              />
            ) : null}
            {optional.length > 0 ? <Section t={t} label="ÖNERİLEN" items={optional} /> : null}
          </View>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ t, children }: { t: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Geri Bildirimler' }} />
      {children}
    </SafeAreaView>
  );
}

function Section({
  t,
  label,
  hint,
  items,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  hint?: string;
  items: PendingFeedbackItem[];
}) {
  return (
    <View style={{ gap: t.space[2] }}>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginBottom: t.space[1] }}>
          {hint}
        </Text>
      ) : null}
      <View style={{ gap: t.space[3] }}>
        {items.map((it) => (
          <FeedbackRow key={it.attemptId} it={it} t={t} mandatory={label === 'ZORUNLU'} />
        ))}
      </View>
    </View>
  );
}

function FeedbackRow({
  it,
  t,
  mandatory,
}: {
  it: PendingFeedbackItem;
  t: ReturnType<typeof useTheme>;
  mandatory: boolean;
}) {
  const date = it.postExamCompletedAt
    ? new Date(it.postExamCompletedAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/feedback/[attemptId]',
          params: { attemptId: it.attemptId, title: it.trainingTitle },
        })
      }
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <View
        style={{
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: mandatory ? t.colors.status.warning : t.colors.border.subtle,
          padding: t.space[4],
        }}
      >
        <Stack direction="row" justify="space-between" align="center" gap={3}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyEmph" numberOfLines={2}>
              {it.trainingTitle}
            </Text>
            {date ? (
              <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[1] }}>
                Tamamlandı: {date}
              </Text>
            ) : null}
          </View>
          <IconSymbol name="chevron.right" size={20} color={t.colors.text.tertiary} />
        </Stack>
      </View>
    </Pressable>
  );
}
