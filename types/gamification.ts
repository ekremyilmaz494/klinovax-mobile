/**
 * Oyunlaştırma özeti tipleri — backend `/api/staff/gamification/summary` kontratı
 * (Faz 2). Puan/streak/rozet sunucuda hesaplanır; mobil yalnız gösterir.
 *
 * Not (Faz 3): `gamification/event` yanıtındaki `newBadges` backend'de obje dizisi
 * (`{id,tier,icon}[]`) — event akışı bağlanırken o tip burada tanımlanacak.
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface Badge {
  /** Stabil string kod (backend badge.code), örn. 'first_pass'. */
  id: string;
  tier: BadgeTier;
  /** Backend SF Symbol adı; UI tarafında güvenli IconSymbolName'e eşlenir. */
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface StreakState {
  current: number;
  longest: number;
  freezesLeft: number;
  atRisk: boolean;
}

export interface GamificationSummary {
  /** Toplam puan — statü göstergesi, asla azalmaz. */
  points: number;
  streak: StreakState;
  badges: Badge[];
}
