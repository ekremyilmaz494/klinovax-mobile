import { apiFetch } from './client'
import type {
  ExamPhase,
  ExamQuestionsResponse,
  ExamResultsResponse,
  ExamStartResponse,
  ExamSubmitResponse,
} from '@/types/exam'

/**
 * Sınav akışı çağrıları — tümü `apiFetch` üzerinden gider, 401 → otomatik refresh.
 *
 * Path parametre kuralları (backend'den):
 *   - start, questions, save-answer    → assignmentId
 *   - submit, results                  → attemptId VEYA assignmentId (her ikisi de geçer)
 *
 * Mobile akışta `assignmentId` her yerde elimizde olduğu için onu kullanıyoruz.
 */

export function startExam(assignmentId: string): Promise<ExamStartResponse> {
  return apiFetch<ExamStartResponse>(`/api/exam/${assignmentId}/start`, {
    method: 'POST',
  })
}

export function fetchExamQuestions(
  assignmentId: string,
  phase: ExamPhase,
): Promise<ExamQuestionsResponse> {
  return apiFetch<ExamQuestionsResponse>(
    `/api/exam/${assignmentId}/questions?phase=${phase}`,
  )
}

export function saveExamAnswer(
  assignmentId: string,
  body: { questionId: string; selectedOptionId: string; examPhase: ExamPhase },
): Promise<{ saved: true }> {
  return apiFetch<{ saved: true }>(`/api/exam/${assignmentId}/save-answer`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function submitExam(
  assignmentId: string,
  body: {
    answers: { questionId: string; selectedOptionId: string }[]
    phase: ExamPhase
    tabSwitchCount?: number
  },
): Promise<ExamSubmitResponse> {
  return apiFetch<ExamSubmitResponse>(`/api/exam/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchExamResults(assignmentId: string): Promise<ExamResultsResponse> {
  return apiFetch<ExamResultsResponse>(`/api/exam/${assignmentId}/results`)
}
