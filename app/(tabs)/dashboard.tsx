import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ScreenError } from '@/components/ui/ScreenError'
import { StatCard } from '@/components/ui/StatCard'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { DashboardResponse, RecentActivity, UpcomingTraining } from '@/types/staff'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const DANGER = '#dc2626'

export default function DashboardScreen() {
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

  // 401 → session bitti, otomatik logout (AuthGate login'e atar)
  if (error instanceof ApiError && error.status === 401) {
    void logout()
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        <Text style={styles.greeting}>Merhaba,</Text>
        <Text style={styles.email} numberOfLines={1}>{user?.email ?? '—'}</Text>

        {isLoading && !data && (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={PRIMARY} size="large" />
          </View>
        )}

        {error && !data && (
          <ScreenError
            message={error.message || 'Dashboard verileri yüklenemedi.'}
            onRetry={() => void refetch()}
          />
        )}

        {data && (
          <>
            {data.urgentTraining && (
              <View style={styles.urgentCard}>
                <Text style={styles.urgentTitle}>Acil eğitim</Text>
                <Text style={styles.urgentBody} numberOfLines={2}>
                  {data.urgentTraining.title}
                </Text>
                <Text style={styles.urgentDays}>
                  {data.urgentTraining.daysLeft} gün kaldı
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <StatCard label="Atanan" value={data.stats.assigned} tone="info" />
              <StatCard label="Devam" value={data.stats.inProgress} tone="warning" />
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Tamamlanan" value={data.stats.completed} tone="success" />
              <StatCard label="Başarısız" value={data.stats.failed} tone="danger" />
            </View>

            <View style={styles.section}>
              <View style={styles.progressHeader}>
                <Text style={styles.sectionTitle}>Genel ilerleme</Text>
                <Text style={styles.progressPct}>%{data.stats.overallProgress}</Text>
              </View>
              <ProgressBar value={data.stats.overallProgress} height={10} />
            </View>

            <Text style={styles.sectionTitle}>Yaklaşan eğitimler</Text>
            {data.upcomingTrainings.length === 0 ? (
              <EmptyState title="Yaklaşan eğitim yok" description="Tüm atamalarınız güncel." />
            ) : (
              data.upcomingTrainings.map((t) => <UpcomingItem key={t.id} item={t} />)
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Son aktivite</Text>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="Henüz aktivite yok" />
            ) : (
              data.recentActivity.map((a, i) => <ActivityItem key={i} item={a} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function UpcomingItem({ item }: { item: UpcomingTraining }) {
  const daysTone = item.daysLeft <= 7 ? 'danger' : item.daysLeft <= 14 ? 'warning' : 'neutral'
  return (
    <View style={styles.upcomingCard}>
      <Text style={styles.upcomingTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.upcomingMeta}>
        <Text style={styles.upcomingDeadline}>
          {item.deadline || 'Süresiz'}
        </Text>
        {item.deadline && (
          <Badge label={`${item.daysLeft} gün`} tone={daysTone} />
        )}
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar value={item.progress} height={6} />
      </View>
    </View>
  )
}

function ActivityItem({ item }: { item: RecentActivity }) {
  const dot = item.type === 'success' ? '✓' : item.type === 'error' ? '✗' : '•'
  const color = item.type === 'success' ? '#16a34a' : item.type === 'error' ? DANGER : MUTED
  return (
    <View style={styles.activityRow}>
      <Text style={[styles.activityDot, { color }]}>{dot}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityText} numberOfLines={2}>{item.text}</Text>
        <Text style={styles.activityTime}>{item.time}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  greeting: { fontSize: 15, color: MUTED },
  email: { fontSize: 20, fontWeight: '600', color: FG, marginBottom: 16 },

  loaderWrap: { paddingVertical: 32, alignItems: 'center' },

  urgentCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
  },
  urgentTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 },
  urgentBody: { fontSize: 16, color: '#0f172a', fontWeight: '600', marginTop: 6 },
  urgentDays: { fontSize: 13, color: '#dc2626', marginTop: 4, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 12 },

  section: { marginVertical: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressPct: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: FG, marginTop: 12, marginBottom: 8 },

  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  upcomingTitle: { fontSize: 15, fontWeight: '600', color: FG },
  upcomingMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  upcomingDeadline: { fontSize: 13, color: MUTED },

  activityRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  activityDot: { fontSize: 16, fontWeight: '700', width: 16, textAlign: 'center' },
  activityText: { fontSize: 14, color: FG },
  activityTime: { fontSize: 12, color: MUTED, marginTop: 2 },
})
