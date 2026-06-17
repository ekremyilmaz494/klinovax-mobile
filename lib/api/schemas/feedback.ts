import { z } from 'zod';

/**
 * `types/feedback.ts` tiplerinin runtime karşılığı (EY.FR.40 formu). TypeScript
 * tipi tek kaynak; bu şema yalnızca runtime guard — `schemas/exam.ts` ile aynı
 * graceful pass-through deseni (mismatch Sentry'ye loglanır, akış kırılmaz).
 *
 * `questionType` UI'da dallanma noktası (likert/yes-no/text); enum dışı bir değer
 * gelirse ekran text input'a düşer (güvenli) ama mismatch raporlanır.
 */

const feedbackItemSchema = z.looseObject({
  id: z.string(),
  text: z.string(),
  questionType: z.enum(['likert_5', 'yes_partial_no', 'text']),
  isRequired: z.boolean(),
  order: z.number(),
});

const feedbackCategorySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  items: z.array(feedbackItemSchema),
});

const feedbackFormSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  documentCode: z.string(),
  categories: z.array(feedbackCategorySchema),
});

export const feedbackFormResponseSchema = z.looseObject({
  // Kurumun aktif formu yoksa null (200 döner, 404 değil).
  form: feedbackFormSchema.nullable(),
});

export const feedbackSubmitResponseSchema = z.looseObject({
  success: z.literal(true),
  responseId: z.string(),
  submittedAt: z.string(),
});

const pendingFeedbackItemSchema = z.looseObject({
  trainingId: z.string(),
  trainingTitle: z.string(),
  attemptId: z.string(),
  // true ise bu eğitim için geri bildirim yeni eğitim başlatmayı bloklar (start 423).
  isMandatory: z.boolean(),
  postExamCompletedAt: z.string().nullable(),
});

export const pendingFeedbackResponseSchema = z.looseObject({
  items: z.array(pendingFeedbackItemSchema),
  // Kurumda aktif form yoksa false — banner gösterilmez.
  formActive: z.boolean(),
});
