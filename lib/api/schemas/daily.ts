import { z } from 'zod';

/**
 * `types/daily.ts` tiplerinin runtime karşılığı. `looseObject`: backend'in
 * eklediği bilinmeyen alanlar mismatch SAYILMAZ (ileri uyum), eksik zorunlu alan
 * veya yanlış tip mismatch'tir. `schemas/exam.ts` deseniyle aynı.
 */

const dailyOptionSchema = z.looseObject({
  optionId: z.string(),
  text: z.string(),
});

const dailyQuestionSchema = z.looseObject({
  questionId: z.string(),
  prompt: z.string(),
  box: z.number(),
  options: z.array(dailyOptionSchema),
});

export const dailyQuestionsResponseSchema = z.looseObject({
  available: z.boolean(),
  dueCount: z.number(),
  serverDate: z.string(),
  questions: z.array(dailyQuestionSchema),
});

const dailySubmitResultSchema = z.looseObject({
  questionId: z.string(),
  correct: z.boolean(),
  newBox: z.number(),
  nextReviewAt: z.string(),
});

export const dailySubmitResponseSchema = z.looseObject({
  correctCount: z.number(),
  pointsAwarded: z.number(),
  results: z.array(dailySubmitResultSchema),
});
