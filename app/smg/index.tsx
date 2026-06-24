import { useQuery } from '@tanstack/react-query';
import { router, Stack as ExpoStack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Chip, ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchSmgPoints } from '@/lib/api/smg';
import { smgActivityTypeLabel, smgStatusMeta } from '@/lib/smg/labels';
import { useAuthStore } from '@/store/auth';
import type { SmgActivity, SmgMyPointsResponse } from '@/types/smg';

export default function SmgScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [periodId, setPeriodId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<SmgMyPointsResponse, Error>({
    queryKey: ['smg-points', periodId],
    enabled: !!user,
    queryFn: () => fetchSmgPoints(periodId || undefined),
  });

  // 401 defensive sync (diğer liste ekranlarıyla aynı desen; global bridge yanında).
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

  // Tüm aktiviteler tek log'da, tamamlanma tarihine göre yeni→eski.
  const activities = useMemo<SmgActivity[]>(() => {
    if (!data) return [];
    return [...data.approvedActivities, ...data.pendingActivities, ...data.rejectedActivities].sort(
      (a, b) => b.completionDate.localeCompare(a.completionDate),
    );
  }, [data]);

  const periods = data?.periods ?? [];
  const selectedPeriodId = periodId || periods.find((p) => p.isActive)?.id || '';

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
          message={error.message || 'SMG puanların yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  // Aktif SMG dönemi yoksa modül bu kurumda kapalı → boş durum.
  if (data && data.period === null) {
    return (
      <Shell t={t}>
        <View style={{ flex: 1, justifyContent: 'center', padding: t.space[5] }}>
          <EmptyState
            icon="calendar"
            title="Aktif SMG dönemi yok"
            description="Kurumunda şu an açık bir Sürekli Mesleki Gelişim dönemi bulunmuyor."
          />
        </View>
      </Shell>
    );
  }

  const reqd = Math.max(data?.requiredPoints ?? 0, 1);
  const approvedPct = Math.min(100, ((data?.approvedPoints ?? 0) / reqd) * 100);
  const pendingPct = Math.max(
    0,
    Math.min(100 - approvedPct, ((data?.pendingPoints ?? 0) / reqd) * 100),
  );

  return (
    <Shell t={t}>
      <ScrollView
        contentContainerStyle={{
          padding: t.space[5],
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
        {periods.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.space[2], paddingBottom: t.space[4] }}
          >
            {periods.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={p.id === selectedPeriodId}
                onPress={() => setPeriodId(p.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* ── Hero: onaylı / hedef ── */}
        <View
          style={{
            backgroundColor: t.colors.surface.primary,
            borderRadius: t.radius.lg,
            borderWidth: t.hairline,
            borderColor: t.colors.border.subtle,
            padding: t.space[5],
          }}
        >
          <Text variant="overline" tone="tertiary">
            {data?.period?.name ?? 'SMG PUANIM'}
          </Text>
          <Stack direction="row" align="baseline" gap={2} style={{ marginTop: t.space[2] }}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.6}
              style={{
                fontFamily: 'Fraunces_700Bold',
                fontSize: 40,
                lineHeight: 44,
                color: t.colors.text.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {data?.approvedPoints ?? 0}
            </Text>
            <Text variant="title-3" tone="tertiary">
              / {data?.requiredPoints ?? 0} puan
            </Text>
          </Stack>

          {/* İki segmentli ilerleme: onaylı (sage) + bekleyen (amber). */}
          <View
            style={{
              marginTop: t.space[4],
              height: 8,
              borderRadius: t.radius.pill,
              backgroundColor: t.colors.surface.secondary,
              overflow: 'hidden',
              flexDirection: 'row',
            }}
          >
            <View style={{ width: `${approvedPct}%`, backgroundColor: t.colors.status.success }} />
            <View style={{ width: `${pendingPct}%`, backgroundColor: t.colors.status.warning }} />
          </View>
        </View>

        {/* ── Kırılım ── */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: t.space[4],
            backgroundColor: t.colors.surface.primary,
            borderRadius: t.radius.lg,
            borderWidth: t.hairline,
            borderColor: t.colors.border.subtle,
            paddingVertical: t.space[4],
          }}
        >
          <StatCell t={t} label="Onaylı" value={data?.approvedPoints ?? 0} />
          <Divider t={t} />
          <StatCell t={t} label="Bekliyor" value={data?.pendingPoints ?? 0} />
          <Divider t={t} />
          <StatCell t={t} label="Kalan" value={data?.remainingPoints ?? 0} />
          <Divider t={t} />
          <StatCell
            t={t}
            label="Gün"
            value={data?.daysLeft ?? '—'}
            danger={data?.daysLeft != null && data.daysLeft <= 14}
          />
        </View>

        <View style={{ marginTop: t.space[4] }}>
          <Button
            label="Aktivite Ekle"
            variant="outline"
            size="lg"
            onPress={() => router.push('/smg/add')}
            fullWidth
          />
        </View>

        {/* ── Aktivite log'u ── */}
        <Text
          variant="overline"
          tone="tertiary"
          style={{ marginTop: t.space[8], marginBottom: t.space[3] }}
        >
          AKTİVİTELERİM
        </Text>
        {activities.length === 0 ? (
          <EmptyState
            icon="doc.text"
            title="Henüz aktivite yok"
            description="Sınav geçtikçe puanlar otomatik eklenir; manuel aktivite de ekleyebilirsin."
          />
        ) : (
          <View style={{ gap: t.space[3] }}>
            {activities.map((a) => (
              <ActivityCard key={a.id} a={a} t={t} />
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
      <ExpoStack.Screen options={{ title: 'SMG Puanlarım' }} />
      {children}
    </SafeAreaView>
  );
}

function Divider({ t }: { t: ReturnType<typeof useTheme> }) {
  return <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />;
}

function StatCell({
  t,
  label,
  value,
  danger,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  value: number | string;
  /** Son tarihe ≤14 gün — web paritesi: değeri kırmızı göster (aciliyet). */
  danger?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: t.space[1] }}>
      <Text
        style={{
          fontFamily: 'Fraunces_700Bold',
          fontSize: 22,
          lineHeight: 26,
          color: danger ? t.colors.status.danger : t.colors.text.primary,
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

function ActivityCard({ a, t }: { a: SmgActivity; t: ReturnType<typeof useTheme> }) {
  const status = smgStatusMeta(a.approvalStatus);
  const date = new Date(a.completionDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
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
      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="tertiary">
            {smgActivityTypeLabel(a.activityType)}
          </Text>
          <Text variant="bodyEmph" numberOfLines={2} style={{ marginTop: 2 }}>
            {a.title}
          </Text>
        </View>
        <Stack direction="row" align="center" gap={2}>
          <Text
            variant="bodyEmph"
            style={{ color: t.colors.accent.clay, fontVariant: ['tabular-nums'] }}
          >
            +{a.smgPoints}
          </Text>
          <Badge label={status.label} tone={status.tone} />
        </Stack>
      </Stack>
      <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[2] }}>
        {date}
        {a.provider ? ` · ${a.provider}` : ''}
      </Text>
      {a.approvalStatus === 'REJECTED' && a.rejectionReason ? (
        <View
          style={{
            marginTop: t.space[3],
            backgroundColor: t.colors.surface.secondary,
            borderRadius: t.radius.md,
            padding: t.space[3],
          }}
        >
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[1] }}>
            RED NEDENİ
          </Text>
          <Text variant="footnote" tone="secondary">
            {a.rejectionReason}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
