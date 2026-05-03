import { useQuery } from '@tanstack/react-query'
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge } from '@/components/ui/Badge'
import { ScreenError } from '@/components/ui/ScreenError'
import { Button, Card, IconDot, Stack, Text, useTheme } from '@/design-system'
import { ApiError, apiFetch } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth'
import type { AssignmentStatus, TrainingDetail, TrainingVideo } from '@/types/staff'

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
  const t = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const { data, error, isLoading, refetch } = useQuery<TrainingDetail, Error>({
    queryKey: ['training-detail', id],
    enabled: !!user && !!id,
    queryFn: () => apiFetch<TrainingDetail>(`/api/staff/my-trainings/${id}`),
  })

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout()
  }, [error, logout])

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Eğitim detayı', headerBackTitle: 'Geri' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
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
  const t = useTheme()
  const action = resolveAction(data)

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      {data.category ? (
        <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
          {data.category}
        </Text>
      ) : null}

      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <Text variant="title-1" style={{ flex: 1 }}>
          {data.title}
        </Text>
        <Badge label={STATUS_LABEL[data.status]} tone={STATUS_TONE[data.status]} />
      </Stack>

      {data.description ? (
        <Text variant="body" tone="secondary" style={{ marginTop: 14, lineHeight: 24 }}>
          {data.description}
        </Text>
      ) : null}

      {data.isExpired ? (
        <Card variant="danger" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.danger, marginBottom: 4 }}>
            SÜRE DOLDU
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitimin süresi doldu.
          </Text>
        </Card>
      ) : null}

      {data.needsRetry && !data.isExpired ? (
        <Card variant="warning" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
            YENİDEN DENENEBİLİR
          </Text>
          <Text variant="body" tone="primary">
            Son denemede %{data.lastAttemptScore ?? 0} aldınız. Geçme barajı %{data.passingScore}. Kalan deneme:{' '}
            <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
              {data.maxAttempts - data.currentAttempt}/{data.maxAttempts}
            </Text>
            .
          </Text>
        </Card>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 24,
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
        }}
      >
        <MetaCell label="Geçme barajı" value={`%${data.passingScore}`} side="left" top />
        <MetaCell label="Sınav süresi" value={data.examDuration ? `${data.examDuration} dk` : '—'} top />
        <MetaCell label="Deneme" value={`${data.currentAttempt}/${data.maxAttempts}`} side="left" />
        <MetaCell label="Son tarih" value={data.deadline || '—'} />
      </View>

      <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
        İlerleme
      </Text>
      <View style={{ gap: 10 }}>
        {!data.examOnly && (
          <Step n={1} label="Ön sınav" done={data.preExamCompleted} />
        )}
        {!data.examOnly && (
          <Step n={2} label="Videolar" done={data.videosCompleted} />
        )}
        <Step
          n={data.examOnly ? 1 : 3}
          label="Son sınav"
          done={data.postExamCompleted}
          score={data.lastAttemptScore}
        />
      </View>

      {data.videos.length > 0 && !data.examOnly ? (
        <>
          <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
            Videolar ({data.videos.length})
          </Text>
          <View style={{ gap: 8 }}>
            {data.videos.map((v, i) => (
              <VideoRow key={v.id} index={i + 1} video={v} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 32 }}>
        <Button
          label={action.label}
          variant="primary"
          size="lg"
          disabled={action.disabled}
          onPress={() => router.push(`/exam/${data.assignmentId}/start`)}
          fullWidth
        />
      </View>
    </ScrollView>
  )
}

function MetaCell({
  label,
  value,
  side,
  top,
}: {
  label: string
  value: string
  side?: 'left' | 'right'
  top?: boolean
}) {
  const t = useTheme()
  return (
    <View
      style={{
        width: '50%',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: top ? 0 : t.hairline,
        borderTopColor: t.colors.border.subtle,
        borderRightWidth: side === 'left' ? t.hairline : 0,
        borderRightColor: t.colors.border.subtle,
      }}
    >
      <Text variant="overline" tone="tertiary" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <Text variant="bodyEmph" tone="primary">
        {value}
      </Text>
    </View>
  )
}

function Step({ n, label, done, score }: { n: number; label: string; done: boolean; score?: number }) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: 14,
      }}
    >
      <IconDot variant={done ? 'success' : 'neutral'} size={28} numeral={done ? undefined : n} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmph" tone={done ? 'success' : 'primary'}>
          {label}
        </Text>
        {typeof score === 'number' && done ? (
          <Text variant="caption" tone="tertiary" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            %{score}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function VideoRow({ index, video }: { index: number; video: TrainingVideo }) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: 12,
      }}
    >
      <IconDot
        variant={video.completed ? 'success' : 'neutral'}
        size={24}
        numeral={video.completed ? undefined : index}
      />
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmph" numberOfLines={2}>
          {video.title}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {video.duration}
        </Text>
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
