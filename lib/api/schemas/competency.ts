import { z } from 'zod';

/** `types/competency.ts` runtime guard'ı (360° yetkinlik modülü). */

const formLite = z.looseObject({
  id: z.string(),
  title: z.string(),
  periodEnd: z.string().nullable(),
});

const pendingEvaluationSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  evaluatorType: z.string(),
  form: formLite,
  subject: z.looseObject({
    firstName: z.string(),
    lastName: z.string(),
    departmentRel: z.looseObject({ name: z.string() }).nullable(),
  }),
});

const mySubjectEvaluationSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  evaluatorType: z.string(),
  overallScore: z.number().nullable(),
  completedAt: z.string().nullable(),
  form: formLite,
});

export const evaluationsListResponseSchema = z.looseObject({
  pending: z.array(pendingEvaluationSchema),
  mySubjectEvals: z.array(mySubjectEvaluationSchema),
});

const evaluationItemSchema = z.looseObject({
  id: z.string(),
  text: z.string(),
  description: z.string().nullable(),
  order: z.number(),
});

const evaluationCategorySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  order: z.number(),
  items: z.array(evaluationItemSchema),
});

export const evaluationDetailResponseSchema = z.looseObject({
  evaluation: z.looseObject({
    id: z.string(),
    status: z.string(),
    evaluatorType: z.string(),
    form: z.looseObject({
      id: z.string(),
      title: z.string(),
      categories: z.array(evaluationCategorySchema),
    }),
    subject: z.looseObject({
      firstName: z.string(),
      lastName: z.string(),
      // Backend `title String?` — null gelebilir; nullable yoksa gereksiz drift logu olur.
      title: z.string().nullable().optional(),
      departmentRel: z.looseObject({ name: z.string() }).nullable(),
    }),
    answers: z.array(
      z.looseObject({
        itemId: z.string(),
        score: z.number(),
        comment: z.string().nullable(),
      }),
    ),
  }),
  totalItems: z.number(),
  answeredItems: z.number(),
  progress: z.number(),
});

export const submitEvaluationResponseSchema = z.looseObject({
  success: z.literal(true),
  overallScore: z.number(),
});

const competencyResultSchema = z.looseObject({
  id: z.string(),
  formId: z.string(),
  formTitle: z.string(),
  periodEnd: z.string().nullable(),
  evaluatorType: z.string(),
  overallScore: z.number().nullable(),
  completedAt: z.string().nullable(),
  categories: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      weight: z.number(),
      avgScore: z.number().nullable(),
    }),
  ),
});

export const competencyMeResponseSchema = z.looseObject({
  evaluations: z.array(competencyResultSchema),
});
