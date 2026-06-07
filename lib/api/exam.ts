import { apiFetch } from './client';
import {
  examQuestionsResponseSchema,
  examResultsResponseSchema,
  examStartResponseSchema,
  examSubmitResponseSchema,
  examTimerResponseSchema,
  examVideosResponseSchema,
  saveAnswerResponseSchema,
  videoProgressResponseSchema,
} from './schemas/exam';
import { validate } from './schemas/index';
import type {
  ExamPhase,
  ExamQuestionsResponse,
  ExamResultsResponse,
  ExamStartResponse,
  ExamSubmitResponse,
  ExamVideosResponse,
  VideoProgressResponse,
} from '@/types/exam';

/**
 * Sınav akışı çağrıları — tümü `apiFetch` üzerinden gider, 401 → otomatik refresh.
 *
 * Path parametre kuralları (backend'den):
 *   - start, questions, save-answer    → assignmentId
 *   - submit, results                  → attemptId VEYA assignmentId (her ikisi de geçer)
 *
 * Mobile akışta `assignmentId` her yerde elimizde olduğu için onu kullanıyoruz.
 */

export async function startExam(assignmentId: string): Promise<ExamStartResponse> {
  const data = await apiFetch<ExamStartResponse>(`/api/exam/${assignmentId}/start`, {
    method: 'POST',
  });
  return validate(examStartResponseSchema, data, 'exam.start');
}

export async function fetchExamQuestions(
  assignmentId: string,
  phase: ExamPhase,
): Promise<ExamQuestionsResponse> {
  const data = await apiFetch<ExamQuestionsResponse>(
    `/api/exam/${assignmentId}/questions?phase=${phase}`,
  );
  return validate(examQuestionsResponseSchema, data, 'exam.questions');
}

export async function saveExamAnswer(
  assignmentId: string,
  body: { questionId: string; selectedOptionId: string; examPhase: ExamPhase },
): Promise<{ saved: true }> {
  const data = await apiFetch<{ saved: true }>(`/api/exam/${assignmentId}/save-answer`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(saveAnswerResponseSchema, data, 'exam.saveAnswer');
}

export async function submitExam(
  assignmentId: string,
  body: {
    answers: { questionId: string; selectedOptionId: string }[];
    phase: ExamPhase;
    tabSwitchCount?: number;
  },
): Promise<ExamSubmitResponse> {
  const data = await apiFetch<ExamSubmitResponse>(`/api/exam/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  // phase/isPassed/feedbackRequired yanıttan eksilirse result yönlendirmesi sessizce
  // yanlış dala sapar — mismatch'i tek noktada Sentry'ye raporla.
  return validate(examSubmitResponseSchema, data, 'exam.submit');
}

export async function fetchExamResults(assignmentId: string): Promise<ExamResultsResponse> {
  const data = await apiFetch<ExamResultsResponse>(`/api/exam/${assignmentId}/results`);
  return validate(examResultsResponseSchema, data, 'exam.results');
}

/**
 * Aktif denemenin video listesini çek. Backend `id` parametresini hem
 * assignmentId hem trainingId olarak kabul eder; biz assignmentId yolluyoruz.
 *
 * `opts.review`: geçmiş (passed/postExamCompleted) eğitimi tekrar izleme modu.
 * `?mode=review` ile backend tüm videoları `completed:true`, `attemptStatus:'review'`
 * döner; ilerleme/tamamlama POST'u 204 no-op'tur. Parametre verilmezse mevcut
 * normal davranış aynen korunur (geriye uyumlu).
 */
export async function fetchExamVideos(
  assignmentId: string,
  opts?: { review?: boolean },
): Promise<ExamVideosResponse> {
  const qs = opts?.review ? '?mode=review' : '';
  const data = await apiFetch<ExamVideosResponse>(`/api/exam/${assignmentId}/videos${qs}`);
  return validate(examVideosResponseSchema, data, 'exam.videos');
}

/**
 * Video izleme progress + completion. `completed: true` yollanıp tüm zorunlu
 * videolar bittiğinde backend attempt status'ünü `post_exam`'a geçirir ve
 * response'ta `allVideosCompleted: true` döner.
 */
export async function saveVideoProgress(
  assignmentId: string,
  body: {
    videoId: string;
    watchedTime?: number;
    position?: number;
    completed?: boolean;
    currentPage?: number;
  },
): Promise<VideoProgressResponse> {
  const data = await apiFetch<VideoProgressResponse>(`/api/exam/${assignmentId}/videos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(videoProgressResponseSchema, data, 'exam.videoProgress');
}

/**
 * Sınav timer'ını sunucudan al — Redis'te canlı sayaç yoksa DB'deki
 * phaseStartedAt'tan recover eder. Kill/reopen sonrası mobile timer'ı
 * server-side authority'ye göre senkronlar. Süresi dolmuşsa backend
 * attempt'i auto-complete edip `expired: true` döner.
 */
export async function fetchExamTimer(assignmentId: string): Promise<{
  remainingSeconds: number;
  expiresAt?: number;
  expired: boolean;
}> {
  const data = await apiFetch<{
    remainingSeconds: number;
    expiresAt?: number;
    expired: boolean;
  }>(`/api/exam/${assignmentId}/timer`, {
    method: 'POST',
  });
  return validate(examTimerResponseSchema, data, 'exam.timer');
}
