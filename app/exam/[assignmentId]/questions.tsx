import { useMutation, useQuery } from '@tanstack/react-query'
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenError } from '@/components/ui/ScreenError'
import { Button, Stack, Text, useTheme } from '@/design-system'
import { fetchExamQuestions } from '@/lib/api/exam'
import { useOnline } from '@/lib/network/use-online'
import type {
  SaveAnswerVars,
  SubmitExamVars,
} from '@/lib/query/mutation-defaults'
import { MUTATION_KEYS } from '@/lib/query/mutation-keys'
import type { ExamPhase, ExamQuestion, ExamQuestionsResponse, ExamSubmitResponse } from '@/types/exam'

/**
 * Sınav soru ekranı.
 *
 * Mantık:
 *   - Sorular bir kere çekilir, kullanıcı index ile gezer.
 *   - Cevap seçildiğinde local state güncellenir + arka planda save-answer çağrılır.
 *   - Toplam süre countdown — sıfıra düşerse otomatik submit.
 *   - "Bitir" → tüm cevaplar submit edilir → result ekranına geçilir.
 */
export default function ExamQuestionsScreen() {
  const t = useTheme()
  const { assignmentId, phase: phaseParam } = useLocalSearchParams<{
    assignmentId: string
    phase: ExamPhase
  }>()
  const phase: ExamPhase = phaseParam === 'post' ? 'post' : 'pre'

  const { data, error, isLoading, refetch } = useQuery<ExamQuestionsResponse, Error>({
    queryKey: ['exam-questions', assignmentId, phase],
    queryFn: () => fetchExamQuestions(assignmentId, phase),
    gcTime: 0,
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
        <ExpoStack.Screen options={{ title: 'Yükleniyor…', headerBackVisible: false }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
        <ExpoStack.Screen options={{ title: 'Hata' }} />
        <ScreenError
          message={error?.message ?? 'Sorular yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    )
  }

  if (data.questions.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
        <ExpoStack.Screen options={{ title: 'Hata' }} />
        <ScreenError
          message="Bu sınava soru tanımlanmamış. Lütfen kurum yöneticisi ile iletişime geç."
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    )
  }

  return <QuestionsView assignmentId={assignmentId} phase={phase} data={data} />
}

function QuestionsView({
  assignmentId,
  phase,
  data,
}: {
  assignmentId: string
  phase: ExamPhase
  data: ExamQuestionsResponse
}) {
  const t = useTheme()
  const { isOnline } = useOnline()
  const [currentIdx, setCurrentIdx] = useState(0)

  const initial = useMemo(() => {
    const m = new Map<string, string>()
    for (const q of data.questions) {
      if (q.savedAnswer) {
        const found = q.options.find((o) => o.optionId === q.savedAnswer || o.id === q.savedAnswer)
        if (found) m.set(q.questionId, found.optionId)
      }
    }
    return m
  }, [data.questions])

  const [answers, setAnswers] = useState<Map<string, string>>(initial)
  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  const saveMutation = useMutation<{ saved: true }, Error, SaveAnswerVars>({
    mutationKey: MUTATION_KEYS.saveAnswer,
  })

  const submitMutation = useMutation<ExamSubmitResponse, Error, SubmitExamVars>({
    mutationKey: MUTATION_KEYS.submitExam,
  })

  const handleSubmitNavigate = (res: ExamSubmitResponse) => {
    if (res.phase === 'pre') {
      Alert.alert(
        'Ön sınav tamamlandı',
        `Skorunuz: %${res.score}\n\nŞimdi eğitim videolarını izleyeceksiniz.`,
        [
          {
            text: 'Devam et',
            onPress: () => router.replace(`/exam/${assignmentId}/videos`),
          },
        ],
      )
    } else {
      router.replace(`/exam/${assignmentId}/result`)
    }
  }

  const buildSubmitVars = (): SubmitExamVars => ({
    assignmentId,
    answers: Array.from(answersRef.current.entries()).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    })),
    phase,
  })

  const triggerSubmit = (opts?: { silent?: boolean }) => {
    submitMutation.mutate(buildSubmitVars(), {
      onSuccess: (res) => handleSubmitNavigate(res),
      onError: (err) => {
        if (opts?.silent) return
        Alert.alert('Sınav gönderilemedi', err.message)
      },
    })
  }

  const endRef = useRef<number>(Date.now() + data.totalTime * 1000)
  const [remaining, setRemaining] = useState<number>(data.totalTime)
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const remMs = endRef.current - Date.now()
      const rem = Math.max(0, Math.ceil(remMs / 1000))
      setRemaining(rem)
      if (rem === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true
        triggerSubmit({ silent: true })
      }
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // currentIdx normalde [0, length-1] arasında — Önceki/Sonraki butonları clamp'liyor.
  // Yine de defansif: setState batching, refetch ile soru sayısı azalması gibi rare
  // durumlarda taşma olabilir; sessiz null yerine ilk soruya düşür.
  const safeIdx = Math.min(currentIdx, data.questions.length - 1)
  const question = data.questions[safeIdx]
  const totalAnswered = answers.size
  const totalQuestions = data.questions.length

  const handleSelect = (q: ExamQuestion, optionUuid: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(q.questionId, optionUuid)
      return next
    })
    saveMutation.mutate({
      assignmentId,
      questionId: q.questionId,
      selectedOptionId: optionUuid,
      examPhase: phase,
    })
  }

  const handleSubmit = () => {
    const unanswered = totalQuestions - totalAnswered
    const offlineNote = !isOnline
      ? '\n\nİnternet yok — sınavın internet bağlantısı gelince otomatik gönderilecek.'
      : ''
    Alert.alert(
      'Sınavı bitir',
      (unanswered > 0
        ? `${unanswered} soru cevaplanmadı. Yine de göndermek istiyor musun?`
        : 'Tüm cevapların gönderilecek. Onaylıyor musun?') + offlineNote,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Bitir', style: 'destructive', onPress: () => triggerSubmit() },
      ],
    )
  }

  const timerColor = remaining < 60 ? t.colors.status.danger : t.colors.accent.clay

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen
        options={{
          title: data.examType,
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />

      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: t.colors.surface.primary,
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: t.hairline,
        }}
      >
        <Text variant="subhead" tone="tertiary" numberOfLines={1}>
          {data.trainingTitle}
        </Text>
        <Stack direction="row" justify="space-between" align="center" style={{ marginTop: 6 }}>
          <Text
            maxFontSizeMultiplier={1.6}
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 22,
              lineHeight: 26,
              color: timerColor,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatTime(remaining)}
          </Text>
          <Text
            variant="subhead"
            tone="tertiary"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            Soru {currentIdx + 1} / {totalQuestions}
          </Text>
        </Stack>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text variant="title-2">{question.text}</Text>

        <View style={{ marginTop: 20, gap: 10 }}>
          {question.options.map((opt) => {
            const selected = answers.get(question.questionId) === opt.optionId
            return (
              <Pressable
                key={opt.optionId}
                onPress={() => handleSelect(question, opt.optionId)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  backgroundColor: selected
                    ? t.colors.accent.clayMuted
                    : t.colors.surface.primary,
                  padding: 14,
                  borderRadius: t.radius.md,
                  borderWidth: selected ? 2 : t.hairline,
                  borderColor: selected ? t.colors.accent.clay : t.colors.border.default,
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 60,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: selected ? t.colors.accent.clay : t.colors.surface.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Fraunces_700Bold',
                      fontSize: 15,
                      color: selected ? t.colors.accent.clayOnAccent : t.colors.text.tertiary,
                    }}
                  >
                    {opt.id.toUpperCase()}
                  </Text>
                </View>
                <Text
                  variant="body"
                  style={{
                    flex: 1,
                    color: selected ? t.colors.text.primary : t.colors.text.secondary,
                    fontFamily: selected ? 'InterTight_500Medium' : 'InterTight_400Regular',
                  }}
                >
                  {opt.text}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          padding: 16,
          gap: 12,
          backgroundColor: t.colors.surface.primary,
          borderTopWidth: t.hairline,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            label="← Önceki"
            variant="outline"
            disabled={currentIdx === 0}
            onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          {currentIdx === totalQuestions - 1 ? (
            <Button
              label={submitMutation.isPending ? 'Gönderiliyor…' : 'Bitir'}
              variant="danger"
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending}
              onPress={handleSubmit}
              fullWidth
            />
          ) : (
            <Button
              label="Sonraki →"
              variant="primary"
              onPress={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
              fullWidth
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
