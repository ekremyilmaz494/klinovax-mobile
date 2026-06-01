import { ApiError } from '@/lib/api/client';

/**
 * Sınav cevap kilidi saf mantığı — `app/exam/[assignmentId]/questions.tsx`'in
 * `handleSelect` 423 rollback'inden extract edildi.
 */

/**
 * Cevap kaydetme hatası backend kilidi (423) mi. Post-exam'da bir sorunun 30sn
 * grace'i dolduğunda backend save-answer'ı 423 ile reddeder; UI önceki seçime
 * geri alınmalı. 429 (rate limit), network, normal Error → false.
 */
export function isAnswerLockError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 423;
}

/**
 * 423 rollback: kilitlenen sorunun local seçimini önceki değerine geri al.
 * `previousAnswer === undefined` ise (hiç seçim yoktu) sorunun girişi silinir.
 * Map'i mutasyona uğratmaz — yeni Map döner (React state setter ile uyumlu).
 */
export function rollbackAnswer(
  answers: ReadonlyMap<string, string>,
  questionId: string,
  previousAnswer: string | undefined,
): Map<string, string> {
  const next = new Map(answers);
  if (previousAnswer !== undefined) {
    next.set(questionId, previousAnswer);
  } else {
    next.delete(questionId);
  }
  return next;
}
