import { type QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/client'
import { saveExamAnswer, saveVideoProgress, submitExam } from '@/lib/api/exam'
import type { ExamPhase, ExamSubmitResponse, VideoProgressResponse } from '@/types/exam'

import { MUTATION_KEYS } from './mutation-keys'

/**
 * Persist edilen mutation'lar için **tek source of truth**: `mutationFn` +
 * `networkMode` + `retry` + `onError` + `onSuccess(invalidate)` burada
 * kayıtlı. Component sadece `useMutation({ mutationKey })` ile referans
 * verir; rehydrate edilen paused mutation da bu registry'den fonksiyonu
 * bulur (component mount değilse bile replay olabilsin).
 *
 * Component'a özel side-effect'ler (router.replace, Alert) `mutate(vars,
 * { onSuccess })` ile per-call iletilir — defaults'taki onSuccess **ek
 * olarak** çalışır, override etmez.
 */

export type SaveAnswerVars = {
  assignmentId: string
  questionId: string
  selectedOptionId: string
  examPhase: ExamPhase
}

export type SubmitExamVars = {
  assignmentId: string
  answers: { questionId: string; selectedOptionId: string }[]
  phase: ExamPhase
}

export type CompleteVideoVars = {
  assignmentId: string
  videoId: string
  position: number
  watchedTime: number
}

/**
 * 4xx hatası kalıcı (yetkisiz, validasyon, conflict) — retry boşa harcanır.
 * 5xx ve network (status=0) hatası geçici, TanStack varsayılan retry'ı zaten
 * hallediyor. ApiError dışı exception'lar da retry edilir (timeout vb.).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status >= 400 && error.status < 500) return false
  }
  return failureCount < 3
}

/**
 * Submit/complete replay sırasında "zaten submit edilmiş" hatası beklenebilir
 * (kullanıcı offline submit'ledi, online'a dönmeden önce başka bir cihazdan
 * submit etti vs.). 409/422 ise idempotent kabul edilir, swallow + invalidate.
 */
function isAlreadyProcessedError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 409 || error.status === 422
}

export function registerMutationDefaults(client: QueryClient): void {
  // ─── saveAnswer ──────────────────────────────────────────────────
  // Cevap seçildiğinde tetiklenir. Last-write-wins: aynı questionId için
  // sıralı replay → son cevap kazanır (FIFO). Backend upsert idempotent.
  client.setMutationDefaults(MUTATION_KEYS.saveAnswer, {
    mutationFn: ({ assignmentId, questionId, selectedOptionId, examPhase }: SaveAnswerVars) =>
      saveExamAnswer(assignmentId, { questionId, selectedOptionId, examPhase }),
    networkMode: 'offlineFirst',
    retry: shouldRetry,
    // saveAnswer cache invalidation YAPMAZ — exam-questions query'si zaten
    // 0 staleTime/gcTime ile çalışır, tekrar girildiğinde fresh fetch olur.
    onError: () => {
      // Validasyon hataları (örn. soru zaten kilitli) silently swallow:
      // backend tek source of truth, kullanıcının ekranda gördüğü cevap
      // yerel state olarak kalır.
    },
  })

  // ─── submitExam ──────────────────────────────────────────────────
  // Sınav teslim. 409/422 (already submitted) durumunda swallow + invalidate.
  client.setMutationDefaults(MUTATION_KEYS.submitExam, {
    mutationFn: ({ assignmentId, answers, phase }: SubmitExamVars) =>
      submitExam(assignmentId, { answers, phase }),
    networkMode: 'offlineFirst',
    retry: shouldRetry,
    onSuccess: (_data: ExamSubmitResponse, vars: SubmitExamVars) => {
      // Liste/dashboard cache'leri yenile — replay sonrası app restart bile
      // olsa fresh data gözüksün
      void client.invalidateQueries({ queryKey: ['my-trainings'] })
      void client.invalidateQueries({ queryKey: ['staff-dashboard'] })
      void client.invalidateQueries({ queryKey: ['training-detail', vars.assignmentId] })
      void client.invalidateQueries({ queryKey: ['certificates'] })
    },
    onError: (error: unknown, vars: SubmitExamVars) => {
      if (isAlreadyProcessedError(error)) {
        // Duplicate submit — backend zaten işlemiş; yine invalidate ki UI senkron olsun
        void client.invalidateQueries({ queryKey: ['my-trainings'] })
        void client.invalidateQueries({ queryKey: ['training-detail', vars.assignmentId] })
      }
    },
  })

  // ─── completeVideo ───────────────────────────────────────────────
  // Video tamamlandı POST. Idempotent: aynı videoId ikinci kez geldiğinde
  // backend yine 200 döner.
  client.setMutationDefaults(MUTATION_KEYS.completeVideo, {
    mutationFn: ({ assignmentId, videoId, position, watchedTime }: CompleteVideoVars) =>
      saveVideoProgress(assignmentId, {
        videoId,
        position,
        watchedTime,
        completed: true,
      }),
    networkMode: 'offlineFirst',
    retry: shouldRetry,
    onSuccess: (_data: VideoProgressResponse, vars: CompleteVideoVars) => {
      void client.invalidateQueries({ queryKey: ['exam-videos', vars.assignmentId] })
      void client.invalidateQueries({ queryKey: ['my-trainings'] })
      void client.invalidateQueries({ queryKey: ['staff-dashboard'] })
      void client.invalidateQueries({ queryKey: ['training-detail', vars.assignmentId] })
    },
    onError: (error: unknown, vars: CompleteVideoVars) => {
      if (isAlreadyProcessedError(error)) {
        void client.invalidateQueries({ queryKey: ['exam-videos', vars.assignmentId] })
      }
    },
  })
}
