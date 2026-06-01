/**
 * Geri bildirim formu tipleri — `/api/feedback/*` ve `/api/staff/feedback/*`
 * endpoint'leriyle senkron (EY.FR.40 zorunlu geri bildirim akışı).
 *
 * Akış:
 *   1) GET  /api/feedback/form                 → FeedbackFormResponse (form null olabilir)
 *   2) POST /api/feedback/submit               → FeedbackSubmitResponse
 *   3) GET  /api/staff/feedback/pending        → PendingFeedbackResponse
 *
 * Tetikleyici: post-exam tamamlanan eğitim zorunlu geri bildirim gerektiriyorsa,
 * personel bu form doldurulmadan yeni eğitim başlatamaz (start endpoint 423 döner).
 */

export type FeedbackQuestionType = 'likert_5' | 'yes_partial_no' | 'text';

export type FeedbackItem = {
  id: string;
  text: string;
  questionType: FeedbackQuestionType;
  isRequired: boolean;
  /** Kategori içi sıralama — UI order'a göre sıralar. */
  order: number;
};

export type FeedbackCategory = {
  id: string;
  name: string;
  /** Kategoriler arası sıralama. */
  order: number;
  items: FeedbackItem[];
};

export type FeedbackForm = {
  id: string;
  title: string;
  description: string;
  /** Doküman kodu (kalite sistemi referansı). */
  documentCode: string;
  categories: FeedbackCategory[];
};

/** `form: null` → kurumun aktif formu yok (200, 404 değil). */
export type FeedbackFormResponse = {
  form: FeedbackForm | null;
};

export type FeedbackAnswer = {
  itemId: string;
  /** likert_5: 1-5 · yes_partial_no: 1-3 (Evet=3, Kısmen=2, Hayır=1). text tipinde gönderilmez. */
  score?: number;
  /** text tipi cevabı, max 2000 karakter. */
  textAnswer?: string;
};

export type FeedbackSubmitBody = {
  attemptId: string;
  /** false → geri bildirim anonim iletilir (varsayılan). */
  includeName: boolean;
  answers: FeedbackAnswer[];
};

export type FeedbackSubmitResponse = {
  success: true;
  responseId: string;
  submittedAt: string;
};

export type PendingFeedbackItem = {
  trainingId: string;
  trainingTitle: string;
  /** submit ve form yönlendirmesinde kullanılan attempt id. */
  attemptId: string;
  /** true ise bu eğitim için geri bildirim yeni eğitim başlatmayı bloklar. */
  isMandatory: boolean;
  postExamCompletedAt: string | null;
};

export type PendingFeedbackResponse = {
  items: PendingFeedbackItem[];
  /** Kurumda aktif form yoksa false — banner gösterilmez. */
  formActive: boolean;
};
