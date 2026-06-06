import { feedbackFormResponseSchema } from './schemas/feedback';
import { validate } from './schemas/index';
import { apiFetch } from './client';
import type {
  FeedbackFormResponse,
  FeedbackSubmitBody,
  FeedbackSubmitResponse,
  PendingFeedbackResponse,
} from '@/types/feedback';

/**
 * Geri bildirim çağrıları — tümü `apiFetch` üzerinden gider, 401 → otomatik refresh.
 *
 * submit anti-cheat değil; offline-replay'e KAYIT EDİLMEZ (kullanıcı sonucu canlı
 * görmeli, 409 "zaten gönderildi" başarı sayılır). Bu yüzden mutationKey yok.
 */

export async function fetchFeedbackForm(): Promise<FeedbackFormResponse> {
  const data = await apiFetch<FeedbackFormResponse>('/api/feedback/form');
  return validate(feedbackFormResponseSchema, data, 'feedback.form');
}

export function submitFeedback(body: FeedbackSubmitBody): Promise<FeedbackSubmitResponse> {
  return apiFetch<FeedbackSubmitResponse>('/api/feedback/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchPendingFeedback(): Promise<PendingFeedbackResponse> {
  return apiFetch<PendingFeedbackResponse>('/api/staff/feedback/pending');
}
