import { z } from 'zod';

/**
 * `types/gamification.ts` runtime karşılığı — `looseObject` (ileri uyum), kritik
 * alanlar tipli. `schemas/exam.ts` deseniyle aynı. Yalnız summary (Faz 2);
 * event şeması Faz 3'te eklenecek.
 */

const badgeTierSchema = z.enum(['bronze', 'silver', 'gold']);

const badgeSchema = z.looseObject({
  id: z.string(),
  tier: badgeTierSchema,
  icon: z.string(),
  earned: z.boolean(),
  earnedAt: z.string().optional(),
});

const streakSchema = z.looseObject({
  current: z.number(),
  longest: z.number(),
  freezesLeft: z.number(),
  atRisk: z.boolean(),
});

export const gamificationSummaryResponseSchema = z.looseObject({
  points: z.number(),
  streak: streakSchema,
  badges: z.array(badgeSchema),
});
