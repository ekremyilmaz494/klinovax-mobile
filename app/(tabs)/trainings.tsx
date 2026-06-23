import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MandatoryFeedbackBanner } from '@/components/feedback/MandatoryFeedbackBanner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { StatCard } from '@/components/ui/StatCard';
import { Chip, ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchMyTrainings, fetchTrainingPeriods } from '@/lib/api/staff';
import { computeAverageScore } from '@/lib/staff/stats';
import { useAuthStore } from '@/store/auth';
import type {
  AssignmentStatus,
  MyTrainingItem,
  MyTrainingsResponse,
  TrainingPeriodsResponse,
} from '@/types/staff';

const PAGE_SIZE = 20;

type FilterValue = AssignmentStatus | 'all';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'assigned', label: 'Atandı' },
  { value: 'in_progress', label: 'Devam' },
  { value: 'passed', label: 'Geçti' },
  { value: 'failed', label: 'Kaldı' },
];

const STATUS_TONE: Record<AssignmentStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  assigned: 'info',
  in_progress: 'warning',
  passed: 'success',
  failed: 'danger',
  locked: 'danger',
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Atandı',
  in_progress: 'Devam',
  passed: 'Geçti',
  failed: 'Kaldı',
  locked: 'Kilitli',
};

export default function TrainingsScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [filter, setFilter] = useState<FilterValue>('all');
  // Dönem seçimi: '' = aktif dönem (backend default). Geçmiş dönem id'si seçilince
  // my-trainings o döneme scope'lanır (queryKey'e dahil → ayrı cache + refetch).
  const [periodId, setPeriodId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: periodsData } = useQuery<TrainingPeriodsResponse, Error>({
    queryKey: ['training-periods'],
    enabled: !!user,
    queryFn: fetchTrainingPeriods,
  });
  const periods = periodsData?.periods ?? [];

  const { data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery<MyTrainingsResponse, Error>({
      queryKey: ['my-trainings', filter, periodId],
      enabled: !!user,
      initialPageParam: 1,
      queryFn: ({ pageParam }) =>
        fetchMyTrainings({
          page: Number(pageParam),
          limit: PAGE_SIZE,
          status: filter === 'all' ? undefined : filter,
          periodId: periodId || undefined,
        }),
      getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const items = useMemo<MyTrainingItem[]>(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // Boş liste sebebi son sayfanın meta'sından — "aktif dönem yok" ≠ "bu filtrede yok".
  const emptyReason = useMemo(() => {
    const pages = data?.pages;
    return pages && pages.length > 0 ? pages[pages.length - 1]?.meta?.reason : undefined;
  }, [data]);

  // Yüklenmiş eğitimlerin ortalama skoru (web personel paneliyle birebir parite — bkz.
  // lib/staff/stats.ts). null ise KPI tile gizlenir.
  const avgScore = useMemo<number | null>(() => computeAverageScore(items), [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <MandatoryFeedbackBanner
        containerStyle={{ paddingHorizontal: t.space[4], paddingTop: t.space[3] }}
      />

      {periods.length > 1 ? (
        // Web paritesi: dönem seçici yalnız >1 dönem varsa görünür. "Aktif Dönem" =
        // periodId boş → backend findActivePeriod. Geçmiş dönem seçilince o döneme scope.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: t.space[4],
            paddingTop: t.space[3],
            gap: t.space[2],
          }}
        >
          <Chip label="Aktif Dönem" selected={periodId === ''} onPress={() => setPeriodId('')} />
          {periods.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={periodId === p.id}
              onPress={() => setPeriodId(p.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Stack
        direction="row"
        gap={2}
        wrap
        style={{
          paddingHorizontal: t.space[4],
          paddingTop: t.space[3],
          paddingBottom: t.space[2],
        }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </Stack>

      {avgScore != null ? (
        <View style={{ paddingHorizontal: t.space[4], paddingBottom: t.space[2] }}>
          <Stack direction="row">
            <StatCard label="ORTALAMA SKOR" value={`%${avgScore}`} tone="success" />
          </Stack>
        </View>
      ) : null}

      {isLoading && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <ScreenError
          message={error.message || 'Eğitim listesi yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <TrainingCard item={item} />}
          contentContainerStyle={{
            padding: t.space[4],
            paddingBottom: t.space[12],
            width: '100%',
            maxWidth: ContentMaxWidth.list,
            alignSelf: 'center',
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            emptyReason === 'no_active_period' ? (
              <EmptyState
                icon="calendar"
                title="Şu an aktif eğitim dönemi yok"
                description="Yeni eğitim dönemi başladığında atanan eğitimlerin burada görünecek."
              />
            ) : emptyReason === 'period_not_found' ? (
              <EmptyState
                icon="calendar"
                title="Eğitim dönemi bulunamadı"
                description="Seçili dönem geçersiz görünüyor. Lütfen daha sonra tekrar dene."
              />
            ) : filter === 'all' ? (
              <EmptyState
                icon="book.fill"
                title="Henüz atanmış eğitimin yok"
                description="Sana eğitim atandığında burada görünecek."
              />
            ) : (
              <EmptyState
                icon="book.fill"
                title="Bu filtrede eğitim yok"
                description="Farklı bir filtre seçmeyi deneyebilirsin."
              />
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: t.space[4] }}>
                <ActivityIndicator color={t.colors.accent.clay} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.colors.accent.clay}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          windowSize={10}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
}

const TrainingCard = memo(function TrainingCard({ item }: { item: MyTrainingItem }) {
  const t = useTheme();
  const tone = STATUS_TONE[item.status];
  const label = STATUS_LABEL[item.status];

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
          padding: t.space[5],
          opacity: pressed ? 0.92 : item.isNotStarted ? 0.78 : 1,
        },
      ]}
      onPress={() => router.push(`/trainings/${item.id}`)}
    >
      {item.category ? (
        <Text
          variant="overline"
          tone="tertiary"
          style={{ marginBottom: t.space[2] }}
          numberOfLines={1}
        >
          {item.category}
        </Text>
      ) : null}

      <Stack direction="row" justify="space-between" gap={3} align="flex-start">
        <Text variant="title-3" numberOfLines={2} style={{ flex: 1 }}>
          {item.title}
        </Text>
        <Stack direction="row" gap={1} align="center">
          {item.isScorm ? <Badge label="SCORM" tone="info" /> : null}
          {item.isNotStarted ? (
            <Badge label="Yakında" tone="info" />
          ) : (
            <Badge label={label} tone={tone} />
          )}
        </Stack>
      </Stack>

      {item.isNotStarted ? (
        // Henüz açılmamış eğitim: tarih bilgisi + kilitli görünüm. Backend exam start
        // endpoint'i de 403 ile reddediyor (defense-in-depth).
        <Stack direction="row" gap={2} align="center" style={{ marginTop: t.space[4] }}>
          <IconSymbol name="lock.fill" size={14} color={t.colors.text.tertiary} />
          <Text variant="footnote" tone="tertiary">
            {item.startDate ? `${item.startDate} tarihinde açılacak` : 'Henüz açılmadı'}
          </Text>
        </Stack>
      ) : (
        <Stack direction="row" justify="space-between" style={{ marginTop: t.space[4] }}>
          <Text variant="footnote" tone="tertiary">
            Son tarih:{' '}
            <Text variant="footnote" weight="semibold" style={{ color: t.colors.text.primary }}>
              {item.deadline || '—'}
            </Text>
          </Text>
          {typeof item.daysLeft === 'number' && item.deadline ? (
            // Web personel paneli paritesi: daysLeft<=3 "urgent" → danger/kırmızı.
            // daysLeft===0 bucket'ı backend'de hem "bugün son" hem "süresi dolmuş"u
            // kapsayabilir (route'ta endDate filtresi yok) — bu yüzden "son gün" iddiası
            // yerine ACİLİYET (danger) gösteriyoruz; web aynı belirsizliği aynı şekilde ele alıyor.
            item.daysLeft <= 3 && item.status !== 'passed' ? (
              <Text variant="footnote" style={{ color: t.colors.status.danger }}>
                {item.daysLeft === 0 ? 'Bugün son' : `Son ${item.daysLeft}g`}
              </Text>
            ) : (
              <Text variant="footnote" tone="tertiary">
                {item.daysLeft} gün kaldı
              </Text>
            )
          ) : null}
        </Stack>
      )}

      {!item.isNotStarted ? (
        <View style={{ marginTop: t.space[3] }}>
          <ProgressBar value={item.progress} height={6} />
        </View>
      ) : null}

      {!item.isNotStarted ? (
        <Stack direction="row" justify="space-between" style={{ marginTop: t.space[3] }}>
          <Text variant="footnote" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
            Deneme: {item.attempt}/{item.maxAttempts}
          </Text>
          {typeof item.score === 'number' ? (
            <Text variant="footnote" tone="tertiary">
              Skor:{' '}
              <Text
                variant="footnote"
                weight="semibold"
                style={{ color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}
              >
                %{item.score}
              </Text>
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Pressable>
  );
});
