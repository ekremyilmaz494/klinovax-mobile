import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationCard } from '@/components/notifications/NotificationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenError } from '@/components/ui/ScreenError';
import { Chip, Stack, Text, useTheme } from '@/design-system';
import { useMarkAllAsRead, useNotifications } from '@/hooks/use-notifications';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import type { NotificationItem } from '@/types/notifications';

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const t = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const navigation = useNavigation();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, refetch } = useNotifications();
  const { mutate: markAllMutate, isPending: markAllPending } = useMarkAllAsRead();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const unreadCount = data?.unreadCount ?? 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 ? (
          <Pressable
            onPress={() => markAllMutate()}
            disabled={markAllPending}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              minHeight: 36,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Tüm bildirimleri okundu olarak işaretle"
          >
            <Text
              variant="subhead"
              style={{
                color: markAllPending ? t.colors.text.tertiary : t.colors.accent.clay,
                fontFamily: 'InterTight_600SemiBold',
              }}
            >
              {markAllPending ? '…' : 'Tümü Okundu'}
            </Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, unreadCount, markAllMutate, markAllPending, t]);

  const items = useMemo<NotificationItem[]>(() => {
    const all = data?.notifications ?? [];
    return filter === 'unread' ? all.filter((n) => !n.isRead) : all;
  }, [data, filter]);

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
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
      >
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
        <ScreenError
          message={error.message || 'Bildirimler yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <Stack
        direction="row"
        gap={2}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}
      >
        <Chip
          label={`Tümü${(data?.notifications.length ?? 0) > 0 ? `  ·  ${data?.notifications.length}` : ''}`}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          label={`Okunmamış${unreadCount > 0 ? `  ·  ${unreadCount}` : ''}`}
          selected={filter === 'unread'}
          onPress={() => setFilter('unread')}
        />
      </Stack>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationCard item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 48 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          filter === 'unread' && (data?.notifications.length ?? 0) > 0 ? (
            <EmptyState
              icon="bell"
              title="Tüm bildirimleri okudun"
              description="Yeni bir bildirim geldiğinde burada görünecek."
            />
          ) : (
            <EmptyState
              icon="bell"
              title="Henüz bildirim almadın"
              description="Eğitim hatırlatmaları, sertifika uyarıları ve duyurular burada görünecek."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent.clay}
          />
        }
      />
    </SafeAreaView>
  );
}
