import { z } from 'zod';

/** `types/smg.ts` runtime guard'ı (`/api/staff/smg/*`). */

const smgActivitySchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  activityType: z.string(),
  completionDate: z.string(),
  smgPoints: z.number(),
  approvalStatus: z.enum(['APPROVED', 'PENDING', 'REJECTED']),
  provider: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string().optional(),
});

export const smgMyPointsResponseSchema = z.looseObject({
  period: z
    .looseObject({
      id: z.string(),
      name: z.string(),
      requiredPoints: z.number(),
      endDate: z.string(),
    })
    .nullable(),
  periods: z.array(z.looseObject({ id: z.string(), name: z.string(), isActive: z.boolean() })),
  approvedPoints: z.number(),
  pendingPoints: z.number(),
  requiredPoints: z.number(),
  remainingPoints: z.number(),
  daysLeft: z.number().nullable(),
  progress: z.number(),
  approvedActivities: z.array(smgActivitySchema),
  pendingActivities: z.array(smgActivitySchema),
  rejectedActivities: z.array(smgActivitySchema),
});

export const smgCategoriesResponseSchema = z.looseObject({
  categories: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      description: z.string().nullable(),
      maxPointsPerActivity: z.number().nullable(),
      isActive: z.boolean(),
      sortOrder: z.number(),
    }),
  ),
});

export const smgActivityResponseSchema = smgActivitySchema;
