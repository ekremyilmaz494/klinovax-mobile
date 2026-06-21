import { apiFetch } from './client';
import { dailyQuestionsResponseSchema, dailySubmitResponseSchema } from './schemas/daily';
import { validate } from './schemas/index';
import type { DailyAnswer, DailyQuestionsResponse, DailySubmitResponse } from '@/types/daily';

/**
 * Günün Soruları (spaced-repetition) — `/api/staff/daily/*`.
 *
 * Backend guard'ları (mobilin bilmesi gerekenler):
 *   - Due-soru SEÇİMİ sunucuda yapılır (anti-cheat; cihaz saatiyle manipülasyon
 *     engellenir). Mobil yalnız gösterir ve cevabı bildirir.
 *   - submit `submissionId` ile idempotent: aynı id tekrar gelirse kredi BİR kez.
 */

export async function fetchDailyQuestions(): Promise<DailyQuestionsResponse> {
  const data = await apiFetch<DailyQuestionsResponse>('/api/staff/daily/questions');
  return validate(dailyQuestionsResponseSchema, data, 'daily.questions');
}

export async function submitDailyAnswers(body: {
  submissionId: string;
  answers: DailyAnswer[];
}): Promise<DailySubmitResponse> {
  const data = await apiFetch<DailySubmitResponse>('/api/staff/daily/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(dailySubmitResponseSchema, data, 'daily.submit');
}
