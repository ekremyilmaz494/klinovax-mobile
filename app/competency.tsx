import { useQuery } from '@tanstack/react-query';
import { Stack as ExpoStack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchMyCompetency } from '@/lib/api/competency';
import { evaluatorTypeLabel } from '@/lib/competency/labels';
import { useAuthStore } from '@/store/auth';
import type { CompetencyMeResponse, CompetencyResult } from '@/types/competency';

export default function CompetencyScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CompetencyMeResponse, Error>({
    queryKey: ['competency-me'],
    enabled: !!user,
    queryFn: fetchMyCompetency,
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

  // Gerçek hatada hata göster (modül kapalıyken backend BOŞ 200 döner → boş durum karşılar).
  if (error && !data) {
    return (
      <Shell t={t}>
        <ScreenError
          message={error.message || 'Yetkinlik sonuçların yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  const results = data?.evaluations ?? [];

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
        {results.length === 0 ? (
          <View style={{ paddingTop: t.space[16] }}>
            <EmptyState
              icon="checkmark.seal.fill"
              title="Henüz yetkinlik sonucun yok"
              description="Hakkındaki değerlendirmeler tamamlandığında sonuçların burada görünecek."
            />
          </View>
        ) : (
          <View style={{ gap: t.space[3] }}>
            {results.map((r) => (
              <ResultCard key={r.id} r={r} t={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ t, children }: { t: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Yetkinlik Sonuçlarım' }} />
      {children}
    </SafeAreaView>
  );
}

function ResultCard({ r, t }: { r: CompetencyResult; t: ReturnType<typeof useTheme> }) {
  const date = r.completedAt
    ? new Date(r.completedAt).toLocaleDateString('tr-TR', {
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
        padding: t.space[5],
      }}
    >
      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="tertiary">
            {evaluatorTypeLabel(r.evaluatorType)}
          </Text>
          <Text variant="title-3" numberOfLines={2} style={{ marginTop: 2 }}>
            {r.formTitle}
          </Text>
          {date ? (
            <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[1] }}>
              {date}
            </Text>
          ) : null}
        </View>
        {r.overallScore != null ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: 'Fraunces_700Bold',
                fontSize: 30,
                lineHeight: 34,
                color: t.colors.accent.clay,
                fontVariant: ['tabular-nums'],
              }}
            >
              %{Math.round(r.overallScore)}
            </Text>
            <Text variant="overline" tone="tertiary">
              GENEL
            </Text>
          </View>
        ) : null}
      </Stack>

      {r.categories.length > 0 ? (
        <View
          style={{
            marginTop: t.space[4],
            paddingTop: t.space[3],
            borderTopWidth: t.hairline,
            borderTopColor: t.colors.border.subtle,
            gap: t.space[2],
          }}
        >
          {r.categories.map((c) => (
            <Stack key={c.id} direction="row" justify="space-between" align="center" gap={3}>
              <Text variant="footnote" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                {c.name}
                <Text variant="caption" tone="tertiary">
                  {'  '}·{'  '}%{Math.round(c.weight)}
                </Text>
              </Text>
              <Text
                variant="footnote"
                weight="semibold"
                style={{ color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}
              >
                {c.avgScore != null ? `${c.avgScore.toFixed(1)} / 5` : '—'}
              </Text>
            </Stack>
          ))}
        </View>
      ) : null}
    </View>
  );
}
