/**
 * Oyunlaştırma özeti tipleri — backend `/api/staff/gamification/summary` kontratı
 * (Faz 2). Puan/streak/rozet sunucuda hesaplanır; mobil yalnız gösterir.
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

/**
 * Puan kazandıran olay tipleri — backend `verifyEvent` ile birebir (Faz 3).
 * Her olay SUNUCUDA kendi kaydından doğrulanır; mobilin iddiasına güvenilmez.
 */
export type GamificationEventType = 'exam_pass' | 'training_complete' | 'feedback_submit';

/**
 * `POST /api/staff/gamification/event` gövdesi.
 *
 * - `eventId`: idempotency anahtarı (backend dedupKey `${type}:${eventId}`). Stabil
 *   bir kayıt uuid'si verilir → ekran re-mount / tekrar gönderimde kredi BİR kez.
 * - `refId`: olayın doğrulanacağı sunucu kaydının uuid'si (exam_pass→ExamAttempt.id,
 *   training_complete→TrainingAssignment.id, feedback_submit→TrainingFeedbackResponse.id).
 */
export interface GamificationEventBody {
  eventId: string;
  type: GamificationEventType;
  refId: string;
}

/** Event yanıtındaki yeni rozet — `Badge`'in earned/earnedAt'siz alt kümesi (backend `NewBadge`). */
export interface NewBadge {
  /** Stabil string kod (backend badge.code). */
  id: string;
  tier: string;
  icon: string;
}

export interface GamificationEventResponse {
  ok: boolean;
  /** 0 ise olay daha önce işlenmiş (idempotent) ya da kredi yok. */
  pointsAwarded: number;
  newBadges: NewBadge[];
}
