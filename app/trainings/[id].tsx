import { useQuery } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { ScreenError } from '@/components/ui/ScreenError'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { AssignmentStatus, TrainingDetail, TrainingVideo } from '@/types/staff'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const DANGER = '#dc2626'

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

export default function TrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const { data, error, isLoading, refetch } = useQuery<TrainingDetail, Error>({
    queryKey: ['training-detail', id],
    enabled: !!user && !!id,
    queryFn: () => apiFetch<TrainingDetail>(`/api/staff/my-trainings/${id}`),
  })

  if (error instanceof ApiError && error.status === 401) {
    void logout()
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <Stack.Screen options={{ title: 'Eğitim detayı', headerBackTitle: 'Geri' }} />

      {isLoading && !data ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Eğitim detayı yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : data ? (
        <Detail data={data} />
      ) : null}
    </SafeAreaView>
  )
}

function Detail({ data }: { data: TrainingDetail }) {
  const action = resolveAction(data)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{data.title}</Text>
        <Badge label={STATUS_LABEL[data.status]} tone={STATUS_TONE[data.status]} />
      </View>
      {data.category ? <Text style={styles.category}>{data.category}</Text> : null}

      {data.description ? (
        <Text style={styles.description}>{data.description}</Text>
      ) : null}

      {data.isExpired && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>Bu eğitimin süresi doldu.</Text>
        </View>
      )}

      {data.needsRetry && !data.isExpired && (
        <View style={styles.retryBanner}>
          <Text style={styles.retryTitle}>Yeniden denenebilir</Text>
          <Text style={styles.retryBody}>
            Son denemede %{data.lastAttemptScore ?? 0} aldınız. Geçme barajı %{data.passingScore}.
            Kalan deneme: {data.maxAttempts - data.currentAttempt}/{data.maxAttempts}.
          </Text>
        </View>
      )}

      <View style={styles.metaGrid}>
        <MetaCell label="Geçme barajı" value={`%${data.passingScore}`} />
        <MetaCell label="Sınav süresi" value={data.examDuration ? `${data.examDuration} dk` : '—'} />
        <MetaCell label="Deneme" value={`${data.currentAttempt}/${data.maxAttempts}`} />
        <MetaCell label="Son tarih" value={data.deadline || '—'} />
      </View>

      <Text style={styles.sectionTitle}>İlerleme</Text>
      <View style={styles.steps}>
        {!data.examOnly && (
          <Step n={1} label="Ön sınav" done={data.preExamCompleted} />
        )}
        {!data.examOnly && (
          <Step n={data.examOnly ? 1 : 2} label="Videolar" done={data.videosCompleted} />
        )}
        <Step
          n={data.examOnly ? 1 : 3}
          label="Son sınav"
          done={data.postExamCompleted}
          score={data.lastAttemptScore}
        />
      </View>

      {data.videos.length > 0 && !data.examOnly && (
        <>
          <Text style={styles.sectionTitle}>Videolar ({data.videos.length})</Text>
          {data.videos.map((v, i) => <VideoRow key={v.id} index={i + 1} video={v} />)}
        </>
      )}

      <Pressable
        style={[styles.cta, action.disabled && styles.ctaDisabled]}
        disabled={action.disabled}
        onPress={() => router.push(`/exam/${data.assignmentId}/start`)}
      >
        <Text style={styles.ctaText}>{action.label}</Text>
      </Pressable>
    </ScrollView>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function Step({ n, label, done, score }: { n: number; label: string; done: boolean; score?: number }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        <Text style={[styles.stepDotText, done && styles.stepDotTextDone]}>
          {done ? '✓' : n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
        {typeof score === 'number' && done && (
          <Text style={styles.stepScore}>%{score}</Text>
        )}
      </View>
    </View>
  )
}

function VideoRow({ index, video }: { index: number; video: TrainingVideo }) {
  return (
    <View style={styles.videoRow}>
      <View style={[styles.videoDot, video.completed && styles.videoDotDone]}>
        <Text style={[styles.videoDotText, video.completed && styles.videoDotTextDone]}>
          {video.completed ? '✓' : index}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.videoMeta}>{video.duration}</Text>
      </View>
    </View>
  )
}

function resolveAction(d: TrainingDetail): { label: string; disabled: boolean } {
  if (d.isExpired) return { label: 'Süresi doldu', disabled: true }
  if (d.status === 'passed') return { label: 'Tamamlandı', disabled: true }
  if (d.needsRetry) return { label: 'Yeniden dene', disabled: false }
  if (d.examOnly) {
    return { label: d.postExamCompleted ? 'Tekrar başla' : 'Sınava başla', disabled: false }
  }
  if (!d.preExamCompleted) return { label: 'Ön sınava başla', disabled: false }
  if (!d.videosCompleted) return { label: 'Videoları izle', disabled: false }
  if (!d.postExamCompleted) return { label: 'Son sınava başla', disabled: false }
  return { label: 'Devam et', disabled: false }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48, gap: 8 },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: FG },
  category: { fontSize: 13, color: MUTED, marginTop: 2 },

  description: { fontSize: 15, color: '#334155', marginTop: 12, lineHeight: 22 },

  expiredBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  expiredText: { color: DANGER, fontSize: 14, fontWeight: '600' },

  retryBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  retryTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 },
  retryBody: { fontSize: 14, color: '#78350f', marginTop: 6, lineHeight: 20 },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
  },
  metaCell: {
    width: '50%',
    padding: 12,
  },
  metaLabel: { fontSize: 12, color: MUTED },
  metaValue: { fontSize: 16, fontWeight: '600', color: FG, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: FG, marginTop: 24, marginBottom: 8 },

  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: PRIMARY },
  stepDotText: { fontSize: 14, fontWeight: '700', color: MUTED },
  stepDotTextDone: { color: '#fff' },
  stepLabel: { fontSize: 15, color: FG, fontWeight: '500' },
  stepLabelDone: { color: '#16a34a' },
  stepScore: { fontSize: 12, color: MUTED, marginTop: 2 },

  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 6 },
  videoDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  videoDotDone: { backgroundColor: PRIMARY },
  videoDotText: { fontSize: 12, fontWeight: '700', color: MUTED },
  videoDotTextDone: { color: '#fff' },
  videoTitle: { fontSize: 14, color: FG, fontWeight: '500' },
  videoMeta: { fontSize: 12, color: MUTED, marginTop: 2 },

  cta: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: '#cbd5e1' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
