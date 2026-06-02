import { z } from 'zod';

/**
 * `types/exam.ts` tiplerinin runtime karşılığı. TypeScript tipi tek kaynak;
 * bu şemalar yalnızca runtime guard. `looseObject` kullanıyoruz: backend'in
 * eklediği bilinmeyen alanlar mismatch SAYILMAZ (ileri uyum), ama eksik zorunlu
 * alan veya yanlış tip mismatch'tir.
 *
 * Derinliği kasten sınırlı tutuyoruz — kritik alanlar (id'ler, status, duration,
 * allVideosCompleted, expired, score, isPassed) doğru tipte olsun yeter; serbest
 * metin alanları `z.string()`. Aşırı katı şema, zararsız backend değişikliklerinde
 * gürültü üretir.
 */

const attemptStatusSchema = z.enum([
  'pre_exam',
  'watching_videos',
  'post_exam',
  'completed',
  'expired',
]);

export const examStartResponseSchema = z.looseObject({
  id: z.string(),
  status: attemptStatusSchema,
  attemptNumber: z.number(),
  examOnly: z.boolean(),
  redirectTo: z.literal('post-exam').optional(),
});

const examOptionSchema = z.looseObject({
  id: z.string(),
  optionId: z.string(),
  text: z.string(),
});

const examQuestionSchema = z.looseObject({
  id: z.number(),
  questionId: z.string(),
  text: z.string(),
  options: z.array(examOptionSchema),
  savedAnswer: z.string().optional(),
});

export const examQuestionsResponseSchema = z.looseObject({
  trainingTitle: z.string(),
  examType: z.string(),
  totalTime: z.number(),
  questions: z.array(examQuestionSchema),
});

export const examTimerResponseSchema = z.looseObject({
  remainingSeconds: z.number(),
  expiresAt: z.number().optional(),
  expired: z.boolean(),
});

const examVideoItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  duration: z.number(),
  // contentType backend'de 'video' | 'pdf' | string — serbest string yeterli.
  contentType: z.string(),
  pageCount: z.number().nullable().optional(),
  completed: z.boolean(),
  lastPosition: z.number(),
  documentUrl: z.string().optional(),
});

export const examVideosResponseSchema = z.looseObject({
  trainingTitle: z.string(),
  // attemptStatus: AttemptStatus | 'review' | null
  attemptStatus: z.union([attemptStatusSchema, z.literal('review')]).nullable(),
  videos: z.array(examVideoItemSchema),
});

const examResultDetailSchema = z.looseObject({
  questionText: z.string(),
  selectedOptionText: z.string().nullable(),
  correctOptionText: z.string().nullable(),
  isCorrect: z.boolean(),
});

export const saveAnswerResponseSchema = z.looseObject({
  saved: z.literal(true),
});

/**
 * Submit yanıtı `phase` ile ayrışır: pre → videolara geçiş, post → sonuç.
 * `feedbackRequired` ve `isPassed` result yönlendirmesini belirler — eksikse
 * akış sessizce yanlış dala sapar, o yüzden runtime guard kritik.
 */
export const examSubmitResponseSchema = z.discriminatedUnion('phase', [
  z.looseObject({
    phase: z.literal('pre'),
    score: z.number(),
    nextStep: z.string(),
  }),
  z.looseObject({
    phase: z.literal('post'),
    score: z.number(),
    isPassed: z.boolean(),
    passingScore: z.number(),
    attemptsRemaining: z.number(),
    feedbackRequired: z.boolean(),
    results: z.array(examResultDetailSchema).optional(),
  }),
]);

export const examResultsResponseSchema = z.looseObject({
  isPassed: z.boolean(),
  score: z.number(),
  passingScore: z.number(),
  attemptsRemaining: z.number(),
  // isPassed=false ise null (anti-cheat)
  results: z.array(examResultDetailSchema).nullable(),
});

export const videoProgressResponseSchema = z.looseObject({
  progress: z.literal(true),
  // allVideosCompleted: tüm zorunlu video bitti → status post_exam'a geçer. Kritik.
  allVideosCompleted: z.boolean(),
});
