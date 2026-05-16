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

export type AttemptStatus = 'pre_exam' | 'watching_videos' | 'post_exam' | 'completed';

export type ExamStartResponse = {
  id: string;
  status: AttemptStatus;
  attemptNumber: number;
  examOnly: boolean;
  /** Backend "post-exam" döndürürse mobile post-exam ekranına atlar (examOnly true). */
  redirectTo?: 'post-exam';
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
  /** Saniye (video) veya sayfa numarası (pdf). */
  lastPosition: number;
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
