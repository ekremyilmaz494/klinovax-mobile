import { apiFetch } from './client';
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

export function fetchAttemptRequests(): Promise<AttemptRequestsResponse> {
  return apiFetch<AttemptRequestsResponse>('/api/staff/attempt-requests');
}

export function createAttemptRequest(body: {
  trainingId: string;
  reason: string;
}): Promise<CreateAttemptRequestResponse> {
  return apiFetch<CreateAttemptRequestResponse>('/api/staff/attempt-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
