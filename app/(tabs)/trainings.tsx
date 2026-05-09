import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Chip, Stack, Text, useTheme } from '@/design-system';
import { ApiError, apiFetch } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import type { AssignmentStatus, MyTrainingItem, MyTrainingsResponse } from '@/types/staff';

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
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Atandı',
  in_progress: 'Devam',
  passed: 'Geçti',
  failed: 'Kaldı',
};

export default function TrainingsScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery<MyTrainingsResponse, Error>({
      queryKey: ['my-trainings', filter],
      enabled: !!user,
      initialPageParam: 1,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('page', String(pageParam));
        params.set('limit', String(PAGE_SIZE));
        if (filter !== 'all') params.set('status', filter);
        return apiFetch<MyTrainingsResponse>(`/api/staff/my-trainings?${params.toString()}`);
      },
      getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const items = useMemo<MyTrainingItem[]>(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

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
      <Stack
        direction="row"
        gap={2}
        wrap
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
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
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="book.fill"
              title="Bu filtrede eğitim yok"
              description="Farklı bir filtre seçmeyi deneyebilirsin."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
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
  const isOverdue = item.daysLeft === 0 && item.status !== 'passed';

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
          padding: 18,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/trainings/${item.id}`)}
    >
      {item.category ? (
        <Text variant="overline" tone="tertiary" style={{ marginBottom: 6 }} numberOfLines={1}>
          {item.category}
        </Text>
      ) : null}

      <Stack direction="row" justify="space-between" gap={3} align="flex-start">
        <Text variant="title-3" numberOfLines={2} style={{ flex: 1 }}>
          {item.title}
        </Text>
        <Badge label={label} tone={tone} />
      </Stack>

      <Stack direction="row" justify="space-between" style={{ marginTop: 14 }}>
        <Text variant="footnote" tone="tertiary">
          Son tarih:{' '}
          <Text
            variant="footnote"
            style={{ color: t.colors.text.primary, fontFamily: 'InterTight_600SemiBold' }}
          >
            {item.deadline || '—'}
          </Text>
        </Text>
        {typeof item.daysLeft === 'number' && item.deadline ? (
          <Text variant="footnote" tone={isOverdue ? 'danger' : 'tertiary'}>
            {isOverdue ? 'Süresi doldu' : `${item.daysLeft} gün kaldı`}
          </Text>
        ) : null}
      </Stack>

      <View style={{ marginTop: 12 }}>
        <ProgressBar value={item.progress} height={6} />
      </View>

      <Stack direction="row" justify="space-between" style={{ marginTop: 12 }}>
        <Text variant="footnote" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
          Deneme: {item.attempt}/{item.maxAttempts}
        </Text>
        {typeof item.score === 'number' ? (
          <Text variant="footnote" tone="tertiary">
            Skor:{' '}
            <Text
              variant="footnote"
              style={{
                color: t.colors.text.primary,
                fontFamily: 'InterTight_600SemiBold',
                fontVariant: ['tabular-nums'],
              }}
            >
              %{item.score}
            </Text>
          </Text>
        ) : null}
      </Stack>
    </Pressable>
  );
});
