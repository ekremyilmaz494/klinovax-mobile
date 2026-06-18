import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack as ExpoStack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Stack, Text, useTheme } from '@/design-system';
import { fetchAuditLogs } from '@/lib/api/audit';
import { ApiError } from '@/lib/api/client';
import { auditActionLabel } from '@/lib/audit/labels';
import { useAuthStore } from '@/store/auth';
import type { AuditLog, AuditLogsResponse } from '@/types/audit';

const PAGE_SIZE = 20;

export default function ActivityScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery<AuditLogsResponse, Error>({
      queryKey: ['audit-logs'],
      enabled: !!user,
      initialPageParam: 1,
      queryFn: ({ pageParam }) => fetchAuditLogs({ page: Number(pageParam), limit: PAGE_SIZE }),
      getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  const logs = useMemo<AuditLog[]>(() => data?.pages.flatMap((p) => p.logs) ?? [], [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'İşlem Geçmişim' }} />

      {isLoading && logs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && logs.length === 0 ? (
        <ScreenError
          message={error.message || 'İşlem geçmişi yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <LogCard item={item} />}
          contentContainerStyle={{ padding: t.space[4], paddingBottom: t.space[12] }}
          ItemSeparatorComponent={() => <View style={{ height: t.space[2] }} />}
          ListHeaderComponent={
            <Text variant="footnote" tone="tertiary" style={{ marginBottom: t.space[3] }}>
              KVKK kapsamında yalnızca kendi hesabına ait işlemler gösterilir.
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="clock"
              title="Henüz kayıtlı işlem yok"
              description="Hesabında bir işlem yapıldığında burada listelenecek."
            />
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
        />
      )}
    </SafeAreaView>
  );
}

function LogCard({ item }: { item: AuditLog }) {
  const t = useTheme();
  const d = new Date(item.createdAt);
  const date = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
          {auditActionLabel(item.action)}
        </Text>
        <Text variant="footnote" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
          {time}
        </Text>
      </Stack>
      <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[1] }}>
        {date}
        {item.ipAddress ? ` · ${item.ipAddress}` : ''}
      </Text>
    </View>
  );
}
