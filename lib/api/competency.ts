import { apiFetch } from './client';
import {
  competencyMeResponseSchema,
  evaluationDetailResponseSchema,
  evaluationsListResponseSchema,
  submitEvaluationResponseSchema,
} from './schemas/competency';
import { validate } from './schemas/index';
import type {
  CompetencyMeResponse,
  EvaluationDetailResponse,
  EvaluationsListResponse,
  SubmitEvaluationBody,
  SubmitEvaluationResponse,
} from '@/types/competency';

/** Bana atanan (bekleyen) + hakkımdaki değerlendirmeler. */
export async function fetchEvaluations(): Promise<EvaluationsListResponse> {
  const data = await apiFetch<EvaluationsListResponse>('/api/staff/evaluations');
  return validate(evaluationsListResponseSchema, data, 'staff.evaluations');
}

/** Tek değerlendirme — form yapısı (kategori/madde) + mevcut cevaplar + progress. */
export async function fetchEvaluation(id: string): Promise<EvaluationDetailResponse> {
  const data = await apiFetch<EvaluationDetailResponse>(`/api/staff/evaluations/${id}`);
  return validate(evaluationDetailResponseSchema, data, 'staff.evaluationDetail');
}

/**
 * Değerlendirmeyi tamamla. TÜM maddeler puanlanmalı (eksikse 400); zaten
 * tamamlanmışsa 409; rate-limit 10/saat (429). Idempotent: eski cevaplar silinip
 * yenileri yazılır. Offline-resume DEĞİL (kullanıcı overallScore'u canlı görmeli).
 */
export async function submitEvaluation(
  id: string,
  body: SubmitEvaluationBody,
): Promise<SubmitEvaluationResponse> {
  const data = await apiFetch<SubmitEvaluationResponse>(`/api/staff/evaluations/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(submitEvaluationResponseSchema, data, 'staff.evaluationSubmit');
}

/** Kendi tamamlanmış yetkinlik sonuçlarım (kategori bazlı + genel skor). */
export async function fetchMyCompetency(): Promise<CompetencyMeResponse> {
  const data = await apiFetch<CompetencyMeResponse>('/api/staff/competency/me');
  return validate(competencyMeResponseSchema, data, 'staff.competencyMe');
}
