import { z } from 'zod';

/**
 * `types/staff.ts` tiplerinin runtime guard'ı. `looseObject` — backend'in eklediği
 * bilinmeyen alanlar mismatch SAYILMAZ (ileri uyum); eksik zorunlu alan / yanlış tip
 * mismatch'tir ve `validate()` ile TEK noktada Sentry'ye loglanır (Faz 3A'daki
 * `hospital→organization` gibi sessiz drift'ler bir daha `undefined`'a düşmesin).
 *
 * Enum'lar tipin kendisi union olduğu yerde kullanılır (status alanları); serbest
 * metin alanları `z.string()`. Aşırı katılık zararsız backend değişikliklerinde gürültü
 * üretir, o yüzden derinlik kasten sınırlı.
 */

const assignmentStatusSchema = z.enum(['assigned', 'in_progress', 'passed', 'failed', 'locked']);

// ─── Dashboard ──────────────────────────────────────────────────────
const dashboardStatsSchema = z.looseObject({
  assigned: z.number(),
  inProgress: z.number(),
  completed: z.number(),
  failed: z.number(),
  overallProgress: z.number(),
});

const upcomingTrainingSchema = z.looseObject({
  id: z.string(),
  trainingId: z.string(),
  title: z.string(),
  deadline: z.string(),
  endDateTime: z.string().nullable(),
  status: assignmentStatusSchema,
  daysLeft: z.number(),
  progress: z.number(),
});

const urgentTrainingSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  daysLeft: z.number(),
});

const dashboardNotificationSchema = z.looseObject({
  title: z.string(),
  time: z.string(),
  isRead: z.boolean(),
});

const recentActivitySchema = z.looseObject({
  text: z.string(),
  time: z.string(),
  type: z.enum(['success', 'error', 'info']),
});

export const dashboardResponseSchema = z.looseObject({
  stats: dashboardStatsSchema,
  upcomingTrainings: z.array(upcomingTrainingSchema),
  urgentTraining: urgentTrainingSchema.nullable(),
  notifications: z.array(dashboardNotificationSchema),
  recentActivity: z.array(recentActivitySchema),
});

// ─── Profile ────────────────────────────────────────────────────────
export const staffProfileSchema = z.looseObject({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  // Kurum adı (`profile.organization?.name ?? ''`). Eski isim `hospital` idi → sessiz drift.
  organization: z.string(),
  department: z.string(),
  title: z.string(),
  avatarUrl: z.string(),
  stats: z.looseObject({
    assignments: z.number(),
    exams: z.number(),
    certificates: z.number(),
  }),
  createdAt: z.string(),
});

// ─── My Trainings (liste) ───────────────────────────────────────────
const myTrainingItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  status: assignmentStatusSchema,
  attempt: z.number(),
  maxAttempts: z.number(),
  startDate: z.string().nullable(),
  isNotStarted: z.boolean(),
  deadline: z.string(),
  progress: z.number(),
  daysLeft: z.number().optional(),
  score: z.number().optional(),
  examOnly: z.boolean(),
  isScorm: z.boolean().optional(),
  questionCount: z.number(),
  examDurationMinutes: z.number().nullable(),
  passingScore: z.number(),
});

export const myTrainingsResponseSchema = z.looseObject({
  data: z.array(myTrainingItemSchema),
  page: z.number(),
  limit: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  // Boş liste sebebi — yalnız data:[] erken dönüşünde gelir (dönem-scoped).
  meta: z.looseObject({ reason: z.enum(['no_active_period', 'period_not_found']) }).optional(),
});

// ─── Training Detail (en kritik — tüm faz flag'leri) ────────────────
const trainingVideoSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  duration: z.string(),
  completed: z.boolean(),
});

const trainingFeedbackStateSchema = z.looseObject({
  formActive: z.boolean(),
  mandatory: z.boolean(),
  submitted: z.boolean(),
  submittedAt: z.string().nullable(),
  canSubmit: z.boolean(),
  attemptId: z.string().nullable(),
});

export const trainingDetailSchema = z.looseObject({
  id: z.string(),
  assignmentId: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  passingScore: z.number(),
  maxAttempts: z.number(),
  examDuration: z.number().nullable(),
  questionCount: z.number().optional(),
  status: assignmentStatusSchema,
  currentAttempt: z.number(),
  deadline: z.string(),
  preExamScore: z.number().optional(),
  lastAttemptScore: z.number().optional(),
  examOnly: z.boolean(),
  isScorm: z.boolean().optional(),
  scormEntryPoint: z.string().nullable().optional(),
  isExpired: z.boolean(),
  startDate: z.string().nullable(),
  isNotStarted: z.boolean(),
  preExamCompleted: z.boolean(),
  videosCompleted: z.boolean(),
  postExamCompleted: z.boolean(),
  needsRetry: z.boolean(),
  isExpiredRetryable: z.boolean().optional(),
  feedback: trainingFeedbackStateSchema.optional(),
  videos: z.array(trainingVideoSchema),
});

// ─── Certificates ───────────────────────────────────────────────────
const certificateSchema = z.looseObject({
  id: z.string(),
  certificateCode: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string().nullable(),
  isExpired: z.boolean(),
  training: z.looseObject({
    title: z.string(),
    category: z.string(),
    isArchived: z.boolean(),
  }),
  score: z.number(),
  attemptNumber: z.number(),
});

export const certificatesResponseSchema = z.looseObject({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  certificates: z.array(certificateSchema),
});

// ─── Attempt Requests (ek deneme hakkı) ─────────────────────────────
const attemptRequestStatusSchema = z.enum(['pending', 'approved', 'rejected']);

const attemptRequestSchema = z.looseObject({
  id: z.string(),
  trainingId: z.string(),
  reason: z.string().nullable(),
  status: attemptRequestStatusSchema,
  grantedAttempts: z.number().nullable(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
  training: z.looseObject({ title: z.string() }),
});

export const attemptRequestsResponseSchema = z.looseObject({
  requests: z.array(attemptRequestSchema),
});

export const createAttemptRequestResponseSchema = z.looseObject({
  message: z.string(),
  request: z.looseObject({
    id: z.string(),
    status: attemptRequestStatusSchema,
    createdAt: z.string(),
  }),
});
