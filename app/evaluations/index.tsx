import { useQuery } from '@tanstack/react-query';
import { router, Stack as ExpoStack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenError } from '@/components/ui/ScreenError';
import { ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { fetchEvaluations } from '@/lib/api/competency';
import { ApiError } from '@/lib/api/client';
import { evaluationStatusMeta, evaluatorTypeLabel } from '@/lib/competency/labels';
import { useAuthStore } from '@/store/auth';
import type {
  EvaluationsListResponse,
  MySubjectEvaluation,
  PendingEvaluation,
} from '@/types/competency';

export default function EvaluationsScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<EvaluationsListResponse, Error>({
    queryKey: ['evaluations'],
    enabled: !!user,
    queryFn: fetchEvaluations,
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

  // Gerçek hatada (403 askıya alma dahil) hata göster — diğer ekranlarla tutarlı.
  // Modül kapalıyken backend BOŞ 200 döner (403 değil) → aşağıdaki boş durum karşılar.
  if (error && !data) {
    return (
      <Shell t={t}>
        <ScreenError
          message={error.message || 'Değerlendirmeler yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  const pending = data?.pending ?? [];
  const mine = data?.mySubjectEvals ?? [];
  const isEmpty = pending.length === 0 && mine.length === 0;

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
        {isEmpty ? (
          <View style={{ paddingTop: t.space[16] }}>
            <EmptyState
              icon="checkmark.circle.fill"
              title="Değerlendirme yok"
              description="Şu an doldurman gereken ya da hakkında tamamlanmış bir değerlendirme bulunmuyor."
            />
          </View>
        ) : (
          <>
            {pending.length > 0 ? (
              <>
                <SectionTitle t={t}>DOLDURMAM GEREKENLER</SectionTitle>
                <View style={{ gap: t.space[3] }}>
                  {pending.map((e) => (
                    <PendingCard key={e.id} e={e} t={t} />
                  ))}
                </View>
              </>
            ) : null}

            {mine.length > 0 ? (
              <>
                <SectionTitle t={t} style={{ marginTop: pending.length > 0 ? t.space[8] : 0 }}>
                  HAKKIMDAKİ
                </SectionTitle>
                <View style={{ gap: t.space[3] }}>
                  {mine.map((e) => (
                    <SubjectCard key={e.id} e={e} t={t} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ t, children }: { t: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Değerlendirmelerim' }} />
      {children}
    </SafeAreaView>
  );
}

function SectionTitle({
  t,
  children,
  style,
}: {
  t: ReturnType<typeof useTheme>;
  children: string;
  style?: import('react-native').StyleProp<import('react-native').TextStyle>;
}) {
  return (
    <Text
      variant="overline"
      tone="tertiary"
      style={[{ marginBottom: t.space[3], marginLeft: t.space[1] }, style]}
    >
      {children}
    </Text>
  );
}

function PendingCard({ e, t }: { e: PendingEvaluation; t: ReturnType<typeof useTheme> }) {
  const name = `${e.subject.firstName} ${e.subject.lastName}`.trim() || 'İsimsiz';
  return (
    <Pressable
      onPress={() => router.push(`/evaluations/${e.id}`)}
      style={({ pressed }) => ({
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: t.space[4],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Stack direction="row" align="center" gap={3}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="tertiary">
            {evaluatorTypeLabel(e.evaluatorType)}
          </Text>
          <Text variant="bodyEmph" numberOfLines={1} style={{ marginTop: 2 }}>
            {name}
          </Text>
          <Text variant="footnote" tone="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>
            {e.form.title}
            {e.subject.departmentRel ? ` · ${e.subject.departmentRel.name}` : ''}
          </Text>
        </View>
        <IconSymbol name="chevron.right" size={18} color={t.colors.text.tertiary} />
      </Stack>
    </Pressable>
  );
}

function SubjectCard({ e, t }: { e: MySubjectEvaluation; t: ReturnType<typeof useTheme> }) {
  const status = evaluationStatusMeta(e.status);
  const date = e.completedAt
    ? new Date(e.completedAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;
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
      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="tertiary">
            {evaluatorTypeLabel(e.evaluatorType)}
          </Text>
          <Text variant="bodyEmph" numberOfLines={2} style={{ marginTop: 2 }}>
            {e.form.title}
          </Text>
        </View>
        <Stack direction="row" align="center" gap={2}>
          {e.overallScore != null ? (
            <Text
              variant="bodyEmph"
              style={{ color: t.colors.accent.clay, fontVariant: ['tabular-nums'] }}
            >
              %{Math.round(e.overallScore)}
            </Text>
          ) : null}
          <Badge label={status.label} tone={status.tone} />
        </Stack>
      </Stack>
      {date ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[2] }}>
          {date}
        </Text>
      ) : null}
    </View>
  );
}
