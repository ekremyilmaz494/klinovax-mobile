import { apiFetch } from './client';
import {
  gamificationEventResponseSchema,
  gamificationSummaryResponseSchema,
} from './schemas/gamification';
import { validate } from './schemas/index';
import type {
  GamificationEventBody,
  GamificationEventResponse,
  GamificationSummary,
} from '@/types/gamification';

/**
 * Oyunlaştırma özeti — `/api/staff/gamification/summary` (puan + streak + rozet).
 *
 * Yalnız OKUMA: puan/streak/rozet sunucuda hesaplanır (anti-cheat — mobilin
 * iddiasına güvenilmez), mobil gösterir.
 */
export async function fetchGamificationSummary(): Promise<GamificationSummary> {
  const data = await apiFetch<GamificationSummary>('/api/staff/gamification/summary');
  return validate(gamificationSummaryResponseSchema, data, 'gamification.summary');
}

/**
 * Puan kazandıran başarı olayını bildirir — `POST /api/staff/gamification/event`.
 *
 * Sunucu olayı KENDİ kaydından doğrular (`verifyEvent`); doğrulanamazsa 422 ve
 * ledger'a yazmaz. Idempotent (dedupKey `${type}:${eventId}`). Çağıran katman
 * best-effort kullanır: olay başarısı kullanıcı akışını bloklamamalı (bkz. useAward).
 */
export async function sendGamificationEvent(
  body: GamificationEventBody,
): Promise<GamificationEventResponse> {
  const data = await apiFetch<GamificationEventResponse>('/api/staff/gamification/event', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(gamificationEventResponseSchema, data, 'gamification.event');
}
