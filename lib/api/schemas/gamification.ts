import { z } from 'zod';

/**
 * `types/gamification.ts` runtime karşılığı — `looseObject` (ileri uyum), kritik
 * alanlar tipli. `schemas/exam.ts` deseniyle aynı. Summary (Faz 2) + event (Faz 3).
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

// Event yanıtındaki newBadge: tier backend'de serbest string (summary'deki enum'dan
// farklı) — burada da z.string() bırak, yoksa katalogda yeni bir tier eklenince
// graceful validate gereksiz uyarı loglar.
const newBadgeSchema = z.looseObject({
  id: z.string(),
  tier: z.string(),
  icon: z.string(),
});

export const gamificationEventResponseSchema = z.looseObject({
  ok: z.boolean(),
  pointsAwarded: z.number(),
  newBadges: z.array(newBadgeSchema),
});
