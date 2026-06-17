import { z } from 'zod';

/** `types/calendar.ts` runtime guard'ı (GET /api/staff/calendar). */

const calendarEventSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  category: z.string().nullable(),
  status: z.enum(['assigned', 'in_progress', 'completed', 'failed', 'locked']),
  trainingId: z.string(),
  eventType: z.enum(['training', 'exam']),
});

export const calendarResponseSchema = z.looseObject({
  events: z.array(calendarEventSchema),
  total: z.number(),
});
