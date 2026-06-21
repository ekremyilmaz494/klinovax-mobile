import { apiFetch } from './client';
import { gamificationSummaryResponseSchema } from './schemas/gamification';
import { validate } from './schemas/index';
import type { GamificationSummary } from '@/types/gamification';

/**
 * Oyunlaştırma özeti — `/api/staff/gamification/summary` (puan + streak + rozet).
 *
 * Yalnız OKUMA: puan/streak/rozet sunucuda hesaplanır (anti-cheat — mobilin
 * iddiasına güvenilmez), mobil gösterir. Puan kazandıran olay bildirimi
 * (`gamification/event`) Faz 3'te ayrı eklenecek (newBadges tip uyumu çözülünce).
 */
export async function fetchGamificationSummary(): Promise<GamificationSummary> {
  const data = await apiFetch<GamificationSummary>('/api/staff/gamification/summary');
  return validate(gamificationSummaryResponseSchema, data, 'gamification.summary');
}
