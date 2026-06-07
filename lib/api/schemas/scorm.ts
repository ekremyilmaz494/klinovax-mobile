import { z } from 'zod';

/**
 * `types/scorm.ts` `ScormAttempt` runtime karşılığı. `looseObject` — backend'in
 * eklediği bilinmeyen alanlar (launchData vb.) mismatch sayılmaz. GET hiç attempt
 * yoksa `null` döndüğü için şema nullable.
 */
export const scormAttemptSchema = z
  .looseObject({
    id: z.string(),
    attemptId: z.string(),
    suspendData: z.string().nullable(),
    lessonStatus: z.string().nullable(),
    score: z.number().nullable(),
    totalTime: z.string().nullable(),
    completionStatus: z.string().nullable(),
    successStatus: z.string().nullable(),
  })
  .nullable();
