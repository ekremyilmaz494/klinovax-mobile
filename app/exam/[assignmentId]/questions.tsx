import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
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

import { ScreenError } from '@/components/ui/ScreenError'
import { fetchExamQuestions, saveExamAnswer, submitExam } from '@/lib/api/exam'
import type { ExamPhase, ExamQuestion, ExamQuestionsResponse } from '@/types/exam'

const PRIMARY = '#0d9668'
const BG = '#f1f5f9'
const FG = '#0f172a'
const MUTED = '#64748b'
const DANGER = '#dc2626'

/**
 * Sınav soru ekranı.
 *
 * Mantık:
 *   - Sorular bir kere çekilir, kullanıcı index ile gezer.
 *   - Cevap seçildiğinde local state güncellenir + arka planda save-answer çağrılır.
 *   - Toplam süre countdown — sıfıra düşerse otomatik submit.
 *   - "Bitir" → tüm cevaplar submit edilir → result ekranına geçilir.
 *   - Pre phase'de submit dönüşü `nextStep: 'videos'` → şimdilik back (videolar Hafta 5).
 */
export default function ExamQuestionsScreen() {
  const { assignmentId, phase: phaseParam } = useLocalSearchParams<{
    assignmentId: string
    phase: ExamPhase
  }>()
  const phase: ExamPhase = phaseParam === 'post' ? 'post' : 'pre'

  const { data, error, isLoading, refetch } = useQuery<ExamQuestionsResponse, Error>({
    queryKey: ['exam-questions', assignmentId, phase],
    queryFn: () => fetchExamQuestions(assignmentId, phase),
    // Sorular cache'lenmemeli — zaman + cevap durumu canlı
    gcTime: 0,
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <Stack.Screen options={{ title: 'Yükleniyor…', headerBackVisible: false }} />
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !data) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <Stack.Screen options={{ title: 'Hata' }} />
        <ScreenError
          message={error?.message ?? 'Sorular yüklenemedi.'}
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
  const qc = useQueryClient()
  const [currentIdx, setCurrentIdx] = useState(0)
  // questionId → selectedOptionId (UUID)
  const initial = useMemo(() => {
    const m = new Map<string, string>()
    for (const q of data.questions) {
      if (q.savedAnswer) {
        const found = q.options.find((o) => o.id === q.savedAnswer)
        if (found) m.set(q.questionId, found.optionId)
      }
    }
    return m
  }, [data.questions])

  const [answers, setAnswers] = useState<Map<string, string>>(initial)

  const saveMutation = useMutation({
    mutationFn: (vars: { questionId: string; selectedOptionId: string }) =>
      saveExamAnswer(assignmentId, { ...vars, examPhase: phase }),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      submitExam(assignmentId, {
        answers: Array.from(answers.entries()).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
        phase,
      }),
    onSuccess: (res) => {
      // Phase tamamlandı → liste/dashboard cache'lerini yenile
      qc.invalidateQueries({ queryKey: ['my-trainings'] })
      qc.invalidateQueries({ queryKey: ['staff-dashboard'] })
      qc.invalidateQueries({ queryKey: ['training-detail', assignmentId] })
      qc.invalidateQueries({ queryKey: ['certificates'] })
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
    },
  })

  // ─── Countdown timer ───
  // İlk render'da end time'ı sabitle; her tick'te kalan süreyi state'te tut.
  const endRef = useRef<number>(Date.now() + data.totalTime * 1000)
  const [remaining, setRemaining] = useState<number>(data.totalTime)

  useEffect(() => {
    const tick = () => {
      const remMs = endRef.current - Date.now()
      const rem = Math.max(0, Math.ceil(remMs / 1000))
      setRemaining(rem)
      if (rem === 0) {
        // Auto-submit on timeout
        if (!submitMutation.isPending && !submitMutation.isSuccess) {
          submitMutation.mutate()
        }
      }
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [submitMutation])

  const question = data.questions[currentIdx]
  const totalAnswered = answers.size
  const totalQuestions = data.questions.length

  const handleSelect = (q: ExamQuestion, optionUuid: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(q.questionId, optionUuid)
      return next
    })
    saveMutation.mutate({ questionId: q.questionId, selectedOptionId: optionUuid })
  }

  const handleSubmit = () => {
    const unanswered = totalQuestions - totalAnswered
    Alert.alert(
      'Sınavı bitir',
      unanswered > 0
        ? `${unanswered} soru cevaplanmadı. Yine de göndermek istiyor musun?`
        : 'Tüm cevapların gönderilecek. Onaylıyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Bitir', style: 'destructive', onPress: () => submitMutation.mutate() },
      ],
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <Stack.Screen
        options={{
          title: data.examType,
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />

      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>{data.trainingTitle}</Text>
        <View style={styles.topMeta}>
          <Text style={[styles.timer, remaining < 60 && styles.timerDanger]}>
            {formatTime(remaining)}
          </Text>
          <Text style={styles.progress}>{currentIdx + 1}/{totalQuestions}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.questionText}>{question.text}</Text>

        <View style={{ marginTop: 16, gap: 10 }}>
          {question.options.map((opt) => {
            const selected = answers.get(question.questionId) === opt.optionId
            return (
              <Pressable
                key={opt.optionId}
                onPress={() => handleSelect(question, opt.optionId)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.optionDot, selected && styles.optionDotSelected]}>
                  <Text style={[styles.optionDotText, selected && styles.optionDotTextSelected]}>
                    {opt.id.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {opt.text}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
          disabled={currentIdx === 0}
          onPress={() => setCurrentIdx((i) => Math.max(0, i - 1))}
        >
          <Text style={styles.navBtnText}>← Önceki</Text>
        </Pressable>

        {currentIdx === totalQuestions - 1 ? (
          <Pressable
            style={[styles.finishBtn, submitMutation.isPending && styles.finishBtnDisabled]}
            disabled={submitMutation.isPending}
            onPress={handleSubmit}
          >
            <Text style={styles.finishText}>
              {submitMutation.isPending ? 'Gönderiliyor…' : 'Bitir'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.navBtnPrimary}
            onPress={() => setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))}
          >
            <Text style={styles.navBtnPrimaryText}>Sonraki →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  title: { fontSize: 14, fontWeight: '600', color: FG },
  topMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timer: { fontSize: 16, fontWeight: '700', color: PRIMARY, fontVariant: ['tabular-nums'] },
  timerDanger: { color: DANGER },
  progress: { fontSize: 14, color: MUTED, fontWeight: '600' },

  body: { padding: 20, paddingBottom: 100 },
  questionText: { fontSize: 18, color: FG, fontWeight: '500', lineHeight: 26 },

  option: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  optionSelected: { borderColor: PRIMARY, backgroundColor: '#ecfdf5' },
  optionDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  optionDotSelected: { backgroundColor: PRIMARY },
  optionDotText: { fontSize: 14, fontWeight: '700', color: MUTED },
  optionDotTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 15, color: FG, lineHeight: 21 },
  optionTextSelected: { color: '#065f46', fontWeight: '500' },

  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 15, color: FG, fontWeight: '500' },
  navBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  navBtnPrimaryText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  finishBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: DANGER,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  finishBtnDisabled: { opacity: 0.6 },
  finishText: { fontSize: 15, color: '#fff', fontWeight: '700' },
})
