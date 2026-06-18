import { apiFetch } from './client';
import { attemptRequestsResponseSchema, createAttemptRequestResponseSchema } from './schemas/staff';
import { validate } from './schemas/index';
import type { AttemptRequestsResponse, CreateAttemptRequestResponse } from '@/types/staff';

/**
 * Ek deneme hakkı talepleri — `/api/staff/attempt-requests`.
 *
 * Backend guard'ları (mobilin bilmesi gerekenler):
 *   - Talep yalnızca hak bittiğinde (currentAttempt >= maxAttempts) ve atama
 *     `passed` değilken kabul edilir; aksi halde 400.
 *   - Aynı eğitim için bekleyen talep varken yenisi 409 döner.
 *   - reason verilirse min 10 / max 1000 karakter; rate limit 5 talep / 5 dk (429).
 */

export async function fetchAttemptRequests(): Promise<AttemptRequestsResponse> {
  const data = await apiFetch<AttemptRequestsResponse>('/api/staff/attempt-requests');
  return validate(attemptRequestsResponseSchema, data, 'staff.attemptRequests');
}

export async function createAttemptRequest(body: {
  trainingId: string;
  reason: string;
}): Promise<CreateAttemptRequestResponse> {
  const data = await apiFetch<CreateAttemptRequestResponse>('/api/staff/attempt-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(createAttemptRequestResponseSchema, data, 'staff.createAttemptRequest');
}
