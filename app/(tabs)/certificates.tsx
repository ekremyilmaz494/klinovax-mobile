import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenError } from '@/components/ui/ScreenError'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { Certificate, CertificatesResponse } from '@/types/staff'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'

export default function CertificatesScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [refreshing, setRefreshing] = useState(false)

  const { data, error, isLoading, refetch } = useQuery<CertificatesResponse, Error>({
    queryKey: ['certificates'],
    enabled: !!user,
    queryFn: () => apiFetch<CertificatesResponse>('/api/staff/certificates?page=1&limit=50'),
  })

  if (error instanceof ApiError && error.status === 401) {
    void logout()
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }, [refetch])

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error && !data) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <ScreenError
          message={error.message || 'Sertifikalar yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    )
  }

  const items = data?.certificates ?? []

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CertificateCard cert={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={styles.header}>
              {data?.total ?? items.length} sertifika
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Henüz sertifikan yok"
            description="Bir eğitimi başarıyla tamamladığında sertifikan burada görünecek."
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      />
    </SafeAreaView>
  )
}

function CertificateCard({ cert }: { cert: Certificate }) {
  const issued = new Date(cert.issuedAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const expires = cert.expiresAt
    ? new Date(cert.expiresAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={2}>{cert.training.title}</Text>
        {cert.isExpired
          ? <Badge label="Süresi doldu" tone="danger" />
          : <Badge label={`%${cert.score}`} tone="success" />}
      </View>
      {cert.training.category ? (
        <Text style={styles.category}>{cert.training.category}</Text>
      ) : null}

      <View style={styles.meta}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Verildi</Text>
          <Text style={styles.metaValue}>{issued}</Text>
        </View>
        {expires && (
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Geçerlilik</Text>
            <Text style={[styles.metaValue, cert.isExpired && styles.expiredText]}>{expires}</Text>
          </View>
        )}
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Deneme</Text>
          <Text style={styles.metaValue}>#{cert.attemptNumber}</Text>
        </View>
      </View>

      <Text style={styles.code} selectable>
        Sertifika No: {cert.certificateCode}
      </Text>

      {cert.training.isArchived && (
        <Text style={styles.archivedNote}>Bu eğitim arşivlenmiş.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 48 },
  header: { fontSize: 13, color: MUTED, marginBottom: 12, fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: FG },
  category: { fontSize: 12, color: MUTED, marginTop: 4 },

  meta: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  metaCol: { minWidth: 80 },
  metaLabel: { fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 14, color: FG, fontWeight: '500', marginTop: 2 },
  expiredText: { color: '#dc2626' },

  code: {
    marginTop: 12,
    fontSize: 12,
    color: MUTED,
    fontVariant: ['tabular-nums'],
  },
  archivedNote: { marginTop: 8, fontSize: 12, color: '#92400e', fontStyle: 'italic' },
})
