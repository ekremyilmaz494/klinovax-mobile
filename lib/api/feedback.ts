import { apiFetch } from './client';
import {
  feedbackFormResponseSchema,
  feedbackSubmitResponseSchema,
  pendingFeedbackResponseSchema,
} from './schemas/feedback';
import { validate } from './schemas/index';
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

export async function submitFeedback(body: FeedbackSubmitBody): Promise<FeedbackSubmitResponse> {
  const data = await apiFetch<FeedbackSubmitResponse>('/api/feedback/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(feedbackSubmitResponseSchema, data, 'feedback.submit');
}

export async function fetchPendingFeedback(): Promise<PendingFeedbackResponse> {
  const data = await apiFetch<PendingFeedbackResponse>('/api/staff/feedback/pending');
  return validate(pendingFeedbackResponseSchema, data, 'feedback.pending');
}
