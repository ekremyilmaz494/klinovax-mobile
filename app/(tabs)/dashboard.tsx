import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ScreenError } from '@/components/ui/ScreenError'
import { StatCard } from '@/components/ui/StatCard'
import { Card, IconDot, Stack, Text, useTheme } from '@/design-system'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { DashboardResponse, RecentActivity, UpcomingTraining } from '@/types/staff'

export default function DashboardScreen() {
  const t = useTheme()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, error, refetch } = useQuery<DashboardResponse, Error>({
    queryKey: ['staff-dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/staff/dashboard'),
    enabled: !!user,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout()
  }, [error, logout])

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.accent.clay} />
        }
      >
        <View style={{ marginBottom: 24 }}>
          <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
            HOŞ GELDİN
          </Text>
          <Text
            italic
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 44,
              lineHeight: 50,
              letterSpacing: -0.8,
              color: t.colors.text.primary,
            }}
          >
            Merhaba,
          </Text>
          <Text variant="title-3" tone="secondary" numberOfLines={1} style={{ marginTop: 4 }}>
            {user?.email ?? '—'}
          </Text>
        </View>

        {isLoading && !data ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.accent.clay} size="large" />
          </View>
        ) : null}

        {error && !data ? (
          <ScreenError
            message={error.message || 'Dashboard verileri yüklenemedi.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {data ? (
          <>
            {data.urgentTraining ? (
              <Card variant="accent" rail style={{ marginBottom: 16 }}>
                <Text variant="overline" style={{ color: t.colors.accent.clay, marginBottom: 6 }}>
                  ACİL EĞİTİM
                </Text>
                <Text variant="title-3" numberOfLines={2}>
                  {data.urgentTraining.title}
                </Text>
                <Stack direction="row" align="center" gap={2} style={{ marginTop: 8 }}>
                  <Badge label={`${data.urgentTraining.daysLeft} gün kaldı`} tone="danger" />
                </Stack>
              </Card>
            ) : null}

            <View
              style={{
                backgroundColor: t.colors.surface.primary,
                borderRadius: t.radius.lg,
                borderWidth: t.hairline,
                borderColor: t.colors.border.subtle,
                overflow: 'hidden',
              }}
            >
              <Stack direction="row">
                <StatCard label="Atanan" value={data.stats.assigned} tone="info" flat />
                <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
                <StatCard label="Devam" value={data.stats.inProgress} tone="warning" flat />
              </Stack>
              <View style={{ height: t.hairline, backgroundColor: t.colors.border.subtle }} />
              <Stack direction="row">
                <StatCard label="Tamamlanan" value={data.stats.completed} tone="success" flat />
                <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />
                <StatCard label="Başarısız" value={data.stats.failed} tone="danger" flat />
              </Stack>
            </View>

            <View style={{ marginTop: 24 }}>
              <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: 10 }}>
                <Text variant="title-3">Genel ilerleme</Text>
                <Text
                  style={{
                    fontFamily: 'Fraunces_700Bold',
                    fontSize: 18,
                    color: t.colors.accent.clay,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  %{data.stats.overallProgress}
                </Text>
              </Stack>
              <ProgressBar value={data.stats.overallProgress} height={10} />
            </View>

            <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
              Yaklaşan eğitimler
            </Text>
            {data.upcomingTrainings.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Yaklaşan eğitim yok"
                description="Tüm atamalarınız güncel."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {data.upcomingTrainings.map((it) => (
                  <UpcomingItem key={it.id} item={it} />
                ))}
              </View>
            )}

            <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
              Son aktivite
            </Text>
            {data.recentActivity.length === 0 ? (
              <EmptyState icon="clock" title="Henüz aktivite yok" />
            ) : (
              <View
                style={{
                  backgroundColor: t.colors.surface.primary,
                  borderRadius: t.radius.lg,
                  borderWidth: t.hairline,
                  borderColor: t.colors.border.subtle,
                  paddingVertical: 4,
                  paddingLeft: 4,
                }}
              >
                {data.recentActivity.map((a, i) => (
                  <ActivityItem
                    key={`${a.time}-${i}`}
                    item={a}
                    isFirst={i === 0}
                    isLast={i === data.recentActivity.length - 1}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function UpcomingItem({ item }: { item: UpcomingTraining }) {
  const t = useTheme()
  const daysTone = item.daysLeft <= 7 ? 'danger' : item.daysLeft <= 14 ? 'warning' : 'neutral'
  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: 16,
      }}
    >
      <Text variant="bodyEmph" numberOfLines={2}>
        {item.title}
      </Text>
      <Stack direction="row" justify="space-between" align="center" style={{ marginTop: 8 }}>
        <Text variant="footnote" tone="tertiary">
          {item.deadline || 'Süresiz'}
        </Text>
        {item.deadline ? <Badge label={`${item.daysLeft} gün`} tone={daysTone} /> : null}
      </Stack>
      <View style={{ marginTop: 12 }}>
        <ProgressBar value={item.progress} height={6} />
      </View>
    </View>
  )
}

function ActivityItem({
  item,
  isFirst,
  isLast,
}: {
  item: RecentActivity
  isFirst: boolean
  isLast: boolean
}) {
  const t = useTheme()
  const variant = item.type === 'success' ? 'success' : item.type === 'error' ? 'danger' : 'neutral'
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 12, paddingRight: 14, gap: 12 }}>
      {/* Timeline rail */}
      <View style={{ width: 22, alignItems: 'center' }}>
        {!isFirst ? (
          <View
            style={{
              width: t.hairline * 2,
              height: 12,
              backgroundColor: t.colors.accent.clayMuted,
            }}
          />
        ) : (
          <View style={{ height: 12 }} />
        )}
        <IconDot variant={variant} size={20} />
        {!isLast ? (
          <View
            style={{
              width: t.hairline * 2,
              flex: 1,
              backgroundColor: t.colors.accent.clayMuted,
              minHeight: 8,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingTop: 12 }}>
        <Text variant="body" numberOfLines={2}>
          {item.text}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {item.time}
        </Text>
      </View>
    </View>
  )
}

