/**
 * "Günün Soruları" (spaced-repetition pekiştirme) tipleri — backend
 * `/api/staff/daily/*` kontratı. Zorunlu sınavdan ayrı, opsiyonel pekiştirme akışı.
 */

export interface DailyQuestionOption {
  optionId: string;
  text: string;
}

export interface DailyQuestion {
  questionId: string;
  prompt: string;
  /** Sorunun mevcut Leitner kutusu (0..5) — yalnız gösterim/ilerleme için. */
  box: number;
  options: DailyQuestionOption[];
}

export interface DailyQuestionsResponse {
  /** Bugün gösterilecek soru var mı — dashboard kartının görünürlüğünü sürer. */
  available: boolean;
  dueCount: number;
  /** Sunucu tarihi (anti-cheat: gün hesabı server-clock'tan). */
  serverDate: string;
  questions: DailyQuestion[];
}

export interface DailyAnswer {
  questionId: string;
  optionId: string;
}

export interface DailySubmitResult {
  questionId: string;
  correct: boolean;
  /** Cevap sonrası yeni Leitner kutusu (sunucu hesaplar). */
  newBox: number;
  nextReviewAt: string;
}

export interface DailySubmitResponse {
  correctCount: number;
  pointsAwarded: number;
  results: DailySubmitResult[];
}
