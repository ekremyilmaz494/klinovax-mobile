import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { fetchExamVideos, saveVideoProgress } from '@/lib/api/exam'
import { loadSession } from '@/lib/auth/secure-token'
import { API_BASE_URL } from '@/lib/config'
import type { ExamVideoItem, ExamVideosResponse } from '@/types/exam'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'

/**
 * Video aşaması ekranı — eğitim videoları sırayla izlenir, her tamamlanma
 * backend'e POST edilir. Tüm zorunlu (non-pdf) videolar bittiğinde backend
 * `allVideosCompleted: true` döner ve attempt status `post_exam`'a geçer.
 */
export default function VideosScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>()
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(null)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  // Bearer token'ı session'dan al — VideoView'e header olarak verilir
  useEffect(() => {
    void loadSession().then((s) => setToken(s?.accessToken ?? null))
  }, [])

  const { data, error, isLoading, refetch } = useQuery<ExamVideosResponse, Error>({
    queryKey: ['exam-videos', assignmentId],
    queryFn: () => fetchExamVideos(assignmentId),
  })

  // İlk açılışta tamamlanmamış ilk video'yu aktif yap
  useEffect(() => {
    if (!data || activeVideoId) return
    const next = data.videos.find((v) => !v.completed && v.contentType !== 'pdf')
    setActiveVideoId(next?.id ?? data.videos[0]?.id ?? null)
  }, [data, activeVideoId])

  const activeVideo = useMemo(
    () => data?.videos.find((v) => v.id === activeVideoId) ?? null,
    [data, activeVideoId],
  )

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <Stack.Screen options={{ title: data?.trainingTitle ?? 'Videolar' }} />

      {isLoading && !data ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Videolar yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : data && data.videos.length === 0 ? (
        <EmptyState title="Bu eğitime video eklenmemiş" />
      ) : data && activeVideo ? (
        <Body
          assignmentId={assignmentId}
          token={token}
          videos={data.videos}
          activeVideo={activeVideo}
          onSelectVideo={setActiveVideoId}
          onAllCompleted={() => {
            queryClient.invalidateQueries({ queryKey: ['exam-videos', assignmentId] })
            queryClient.invalidateQueries({ queryKey: ['my-trainings'] })
            queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['training-detail', assignmentId] })
            Alert.alert(
              'Tüm videolar tamamlandı',
              'Şimdi son sınava geçilecek.',
              [
                {
                  text: 'Devam et',
                  onPress: () => router.replace(`/exam/${assignmentId}/questions?phase=post`),
                },
              ],
            )
          }}
        />
      ) : null}
    </SafeAreaView>
  )
}

function Body({
  assignmentId,
  token,
  videos,
  activeVideo,
  onSelectVideo,
  onAllCompleted,
}: {
  assignmentId: string
  token: string | null
  videos: ExamVideoItem[]
  activeVideo: ExamVideoItem
  onSelectVideo: (id: string) => void
  onAllCompleted: () => void
}) {
  const completedCount = videos.filter((v) => v.completed && v.contentType !== 'pdf').length
  const totalRequired = videos.filter((v) => v.contentType !== 'pdf').length
  const progressPct = totalRequired === 0 ? 0 : Math.round((completedCount / totalRequired) * 100)

  const isPdf = activeVideo.contentType === 'pdf'

  return (
    <View style={{ flex: 1 }}>
      {!isPdf ? (
        <VideoBlock
          assignmentId={assignmentId}
          token={token}
          video={activeVideo}
          onCompleted={(allDone) => {
            if (allDone) onAllCompleted()
          }}
        />
      ) : (
        <View style={[styles.pdfBlock, { margin: 16 }]}>
          <Text style={styles.pdfTitle}>{activeVideo.title}</Text>
          <Text style={styles.pdfNote}>
            PDF içerik mobilde henüz oynatılamıyor. Lütfen web'den izleyin.
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>İlerleme</Text>
          <Text style={styles.progressText}>
            {completedCount}/{totalRequired} video
          </Text>
        </View>
        <ProgressBar value={progressPct} height={8} />

        <Text style={styles.sectionTitle}>Tüm videolar</Text>
        {videos.map((v, i) => (
          <Pressable
            key={v.id}
            style={[styles.videoItem, v.id === activeVideo.id && styles.videoItemActive]}
            onPress={() => onSelectVideo(v.id)}
          >
            <View style={[styles.videoDot, v.completed && styles.videoDotDone]}>
              <Text style={[styles.videoDotText, v.completed && styles.videoDotTextDone]}>
                {v.completed ? '✓' : i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle} numberOfLines={2}>{v.title}</Text>
              <Text style={styles.videoMeta}>
                {formatDuration(v.duration)}
                {v.contentType === 'pdf' ? ' · PDF' : ''}
              </Text>
            </View>
            {v.id === activeVideo.id && <Badge label="Şu an" tone="primary" />}
          </Pressable>
        ))}

        {totalRequired > 0 && completedCount >= totalRequired && (
          <Pressable
            style={styles.cta}
            onPress={() => router.replace(`/exam/${assignmentId}/questions?phase=post`)}
          >
            <Text style={styles.ctaText}>Son sınava geç</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  )
}

function VideoBlock({
  assignmentId,
  token,
  video,
  onCompleted,
}: {
  assignmentId: string
  token: string | null
  video: ExamVideoItem
  onCompleted: (allDone: boolean) => void
}) {
  const sourceUrl = video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`

  // expo-video VideoSource: bearer header + start position desteği
  const source = useMemo(
    () =>
      token
        ? { uri: sourceUrl, headers: { Authorization: `Bearer ${token}` } }
        : sourceUrl,
    [sourceUrl, token],
  )

  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 5
    if (video.lastPosition && video.lastPosition < video.duration - 5) {
      p.currentTime = video.lastPosition
    }
  })

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted })

  // Heartbeat — 10 sn'de bir progress kaydet
  const lastSavedRef = useRef(0)
  const heartbeatMutation = useMutation({
    mutationFn: (body: { videoId: string; position: number; watchedTime: number; completed?: boolean }) =>
      saveVideoProgress(assignmentId, body),
  })

  useEffect(() => {
    const interval = setInterval(() => {
      if (!player.playing) return
      const now = Math.floor(player.currentTime)
      // 10sn'de bir veya pozisyon önemli ölçüde değiştiyse kaydet
      if (now - lastSavedRef.current >= 10) {
        lastSavedRef.current = now
        heartbeatMutation.mutate({
          videoId: video.id,
          position: now,
          watchedTime: now,
        })
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [player, video.id, heartbeatMutation])

  // Completion detection — currentTime >= duration - 1
  const completedRef = useRef(video.completed)
  useEffect(() => {
    completedRef.current = video.completed
  }, [video.completed])

  const completeMutation = useMutation({
    mutationFn: () =>
      saveVideoProgress(assignmentId, {
        videoId: video.id,
        position: video.duration,
        watchedTime: video.duration,
        completed: true,
      }),
    onSuccess: (data) => {
      completedRef.current = true
      onCompleted(data.allVideosCompleted)
    },
  })

  useEffect(() => {
    const id = setInterval(() => {
      if (!player.duration) return
      if (
        !completedRef.current &&
        !completeMutation.isPending &&
        player.currentTime >= player.duration - 1
      ) {
        completeMutation.mutate()
      }
    }, 2000)
    return () => clearInterval(id)
  }, [player, completeMutation])

  return (
    <View style={styles.videoBlock}>
      <VideoView
        style={styles.videoView}
        player={player}
        nativeControls
        allowsFullscreen
        allowsPictureInPicture={false}
        contentFit="contain"
      />
      <View style={styles.videoFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeTitle} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.activeMeta}>
            {isPlaying ? '▶ Oynatılıyor' : '⏸ Duraklatıldı'} · {formatDuration(video.duration)}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            const next = !player.muted
            player.muted = next
            // iOS simulator audio routing bazı sürümlerde muted bayrağını
            // ignore ediyor → volume'ı da 0'a çek (gerçek cihazda her ikisi
            // de tutarlı çalışır).
            player.volume = next ? 0 : 1
          }}
          style={styles.muteBtn}
          hitSlop={8}
        >
          <Text style={styles.muteText}>{muted ? '🔇' : '🔊'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },

  videoBlock: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoView: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoFooter: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#0f172a', gap: 12 },
  activeTitle: { fontSize: 14, color: '#fff', fontWeight: '600' },
  activeMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  muteBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  muteText: { fontSize: 22 },

  pdfBlock: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pdfTitle: { fontSize: 15, fontWeight: '600', color: '#92400e' },
  pdfNote: { fontSize: 13, color: '#78350f', marginTop: 6, lineHeight: 18 },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  progressLabel: { fontSize: 13, color: MUTED, fontWeight: '500' },
  progressText: { fontSize: 13, color: FG, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: FG, marginTop: 24, marginBottom: 8 },

  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  videoItemActive: { borderColor: PRIMARY },
  videoDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  videoDotDone: { backgroundColor: PRIMARY },
  videoDotText: { fontSize: 13, fontWeight: '700', color: MUTED },
  videoDotTextDone: { color: '#fff' },
  videoTitle: { fontSize: 14, color: FG, fontWeight: '500' },
  videoMeta: { fontSize: 12, color: MUTED, marginTop: 2 },

  cta: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
