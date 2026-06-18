/**
 * Sınav akışı tipleri — `/api/exam/*` endpoint'leriyle senkron.
 *
 * Akış:
 *   1) POST /api/exam/[assignmentId]/start → ExamStartResponse
 *   2) GET  /api/exam/[assignmentId]/questions?phase=pre|post → ExamQuestionsResponse
 *   3) POST /api/exam/[assignmentId]/save-answer (her seçimde) → { saved: true }
 *   4) POST /api/exam/[attemptId]/submit { answers, phase } → ExamSubmitResponse
 *   5) GET  /api/exam/[attemptId]/results → ExamResultsResponse
 */

export type ExamPhase = 'pre' | 'post';

/** `expired`: deneme 24h+ stale kaldı / cron veya admin expire etti (terminal). */
export type AttemptStatus = 'pre_exam' | 'watching_videos' | 'post_exam' | 'completed' | 'expired';

export type ExamStartResponse = {
  id: string;
  status: AttemptStatus;
  attemptNumber: number;
  examOnly: boolean;
};

export type ExamOption = {
  /** Görsel id — a/b/c/d. Backend her render için deterministic atar. */
  id: string;
  /** Gerçek option UUID — save-answer ve submit'e bu yollanır. */
  optionId: string;
  text: string;
};

export type ExamQuestion = {
  /** 1-based sıra numarası — sadece UI gösterim için. */
  id: number;
  questionId: string;
  text: string;
  options: ExamOption[];
  /** Daha önce kaydedilen cevap (a/b/c/d görsel id'si). */
  savedAnswer?: string;
};

export type ExamQuestionsResponse = {
  trainingTitle: string;
  examType: string;
  /** Saniye cinsinden toplam süre. */
  totalTime: number;
  questions: ExamQuestion[];
};

export type ExamSubmitResponse =
  | { phase: 'pre'; score: number; nextStep: 'videos' | 'post-exam' }
  | {
      phase: 'post';
      score: number;
      isPassed: boolean;
      passingScore: number;
      /** Backend submit/route.ts response'unda dönüyor; result CTA'sı için lazım. */
      attemptsRemaining: number;
      /** EY.FR.40 zorunlu geri bildirim akışı — true ise feedback formu gerekli. */
      feedbackRequired: boolean;
      /** Başarılıysa soru-bazlı detay; başarısız personele anti-cheat olarak gönderilmez. */
      results?: ExamResultDetail[];
    };

export type ExamResultDetail = {
  questionText: string;
  selectedOptionText: string | null;
  correctOptionText: string | null;
  isCorrect: boolean;
};

export type ExamResultsResponse = {
  isPassed: boolean;
  score: number;
  passingScore: number;
  /** Backend results/route.ts'e eklendi — başarısız retry CTA için. */
  attemptsRemaining: number;
  /** isPassed=false ise null (anti-cheat) */
  results: ExamResultDetail[] | null;
};

export type ExamVideoItem = {
  id: string;
  title: string;
  /** Backend `/api/stream/[id]` proxy URL'i (göreceli). MUTLAKA API_BASE_URL ile prefixle. */
  url: string;
  duration: number;
  contentType: 'video' | 'pdf' | string;
  pageCount?: number | null;
  completed: boolean;
  /** Oynatma çubuğu KONUMU — saniye (video) veya sayfa numarası (pdf). Resume seek için. */
  lastPosition: number;
  /**
   * Gerçekte izlenen toplam süre (saniye). Resume'da izleme sayacı bundan başlar
   * — konumdan (lastPosition) DEĞİL; aksi halde ileri sarıp dönen kullanıcı
   * izlemediği süreyi kredi alır ve %90 anti-cheat eşiği hileyle geçilebilir.
   * Eski backend sürümü döndürmeyebilir → schema default 0.
   */
  watchedSeconds: number;
  documentUrl?: string;
};

export type ExamVideosResponse = {
  trainingTitle: string;
  attemptStatus: AttemptStatus | 'review' | null;
  videos: ExamVideoItem[];
};

export type VideoProgressResponse = {
  progress: true;
  /** Tüm zorunlu (non-pdf) videolar tamamlandığında true; backend status post_exam'a geçer. */
  allVideosCompleted: boolean;
};

/**
 * `GET /api/exam/[id]/state` — sunucu-otoriteli faz çözücü (`resolveExamFlowState`).
 * Mobil foreground'a dönünce (AppState 'active') çağırır: backend kullanıcının olması
 * gereken route'u `redirect`'te döner, mevcut `from` ile uyuşuyorsa `redirect: null`.
 */
export type ExamStage =
  | 'pre_exam'
  | 'watching_videos'
  | 'post_exam'
  | 'completed'
  | 'expired'
  | 'none';

/** Backend'in döndürebileceği kanonik route adları (mobil route'a `examStateRedirectTarget` ile eşlenir). */
export type ExamStateRedirect =
  | 'pre-exam'
  | 'videos'
  | 'post-exam'
  | 'my-training-detail'
  | 'my-trainings';

export type ExamStateResponse = {
  stage: ExamStage;
  attemptId: string | null;
  attemptNumber: number | null;
  assignmentId: string | null;
  /** Doğru route ile uyuşuyorsa null; aksi halde gidilmesi gereken kanonik route. */
  redirect: ExamStateRedirect | null;
  noRequiredVideos: boolean;
};
