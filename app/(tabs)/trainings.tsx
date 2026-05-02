import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ScreenError } from '@/components/ui/ScreenError'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { AssignmentStatus, MyTrainingItem, MyTrainingsResponse } from '@/types/staff'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const PAGE_SIZE = 20

type FilterValue = AssignmentStatus | 'all'

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: 'assigned', label: 'Atandı' },
  { value: 'in_progress', label: 'Devam' },
  { value: 'passed', label: 'Geçti' },
  { value: 'failed', label: 'Kaldı' },
]

const STATUS_TONE: Record<AssignmentStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  assigned: 'info',
  in_progress: 'warning',
  passed: 'success',
  failed: 'danger',
}

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Atandı',
  in_progress: 'Devam',
  passed: 'Geçti',
  failed: 'Kaldı',
}

export default function TrainingsScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [refreshing, setRefreshing] = useState(false)

  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<MyTrainingsResponse, Error>({
    queryKey: ['my-trainings', filter],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      params.set('page', String(pageParam))
      params.set('limit', String(PAGE_SIZE))
      if (filter !== 'all') params.set('status', filter)
      return apiFetch<MyTrainingsResponse>(`/api/staff/my-trainings?${params.toString()}`)
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  })

  if (error instanceof ApiError && error.status === 401) {
    void logout()
  }

  const items = useMemo<MyTrainingItem[]>(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }, [refetch])

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.chip, filter === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
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
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              title="Bu filtrede eğitim yok"
              description="Farklı bir filtre seçmeyi deneyebilirsin."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  )
}

function TrainingCard({ item }: { item: MyTrainingItem }) {
  const tone = STATUS_TONE[item.status]
  const label = STATUS_LABEL[item.status]
  const isOverdue = item.daysLeft === 0 && item.status !== 'passed'

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/trainings/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Badge label={label} tone={tone} />
      </View>

      {item.category ? (
        <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
      ) : null}

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Son tarih: <Text style={styles.metaStrong}>{item.deadline || '—'}</Text>
        </Text>
        {typeof item.daysLeft === 'number' && item.deadline ? (
          <Text style={[styles.metaText, isOverdue && { color: '#dc2626' }]}>
            {isOverdue ? 'Süresi doldu' : `${item.daysLeft} gün kaldı`}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: 8 }}>
        <ProgressBar value={item.progress} height={6} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Deneme: {item.attempt}/{item.maxAttempts}
        </Text>
        {typeof item.score === 'number' && (
          <Text style={styles.footerText}>
            Skor: <Text style={styles.metaStrong}>%{item.score}</Text>
          </Text>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '500', color: MUTED },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  cardPressed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 15, fontWeight: '600', color: FG, flex: 1 },
  category: { fontSize: 12, color: MUTED, marginTop: 4 },

  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { fontSize: 12, color: MUTED },
  metaStrong: { color: FG, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  footerText: { fontSize: 12, color: MUTED },
})
