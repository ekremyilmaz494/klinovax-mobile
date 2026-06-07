/**
 * Backend `/api/staff/*` response tipleri.
 * Web'deki Prisma modellerinden türetilen Zod şemaları sonradan paylaşımlı pakete
 * taşınacak (Faz 2). Şimdilik backend route'larıyla manuel senkron tutuluyor.
 */

/** `locked`: eğitim kurum tarafından arşivlendi/kaldırıldı (web state machine: TRAINING_LOCKED). */
export type AssignmentStatus = 'assigned' | 'in_progress' | 'passed' | 'failed' | 'locked';

export type DashboardStats = {
  assigned: number;
  inProgress: number;
  completed: number;
  failed: number;
  overallProgress: number;
};

export type UpcomingTraining = {
  id: string;
  trainingId: string;
  title: string;
  deadline: string;
  endDateTime: string | null;
  status: AssignmentStatus;
  daysLeft: number;
  progress: number;
};

export type UrgentTraining = {
  id: string;
  title: string;
  daysLeft: number;
};

export type DashboardNotification = {
  title: string;
  time: string;
  isRead: boolean;
};

export type RecentActivity = {
  text: string;
  time: string;
  type: 'success' | 'error' | 'info';
};

export type DashboardResponse = {
  stats: DashboardStats;
  upcomingTrainings: UpcomingTraining[];
  urgentTraining: UrgentTraining | null;
  notifications: DashboardNotification[];
  recentActivity: RecentActivity[];
};

export type StaffProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hospital: string;
  department: string;
  title: string;
  avatarUrl: string;
  stats: { assignments: number; exams: number; certificates: number };
  createdAt: string;
};

export type MyTrainingItem = {
  id: string;
  title: string;
  category: string;
  status: AssignmentStatus;
  attempt: number;
  maxAttempts: number;
  startDate: string | null;
  isNotStarted: boolean;
  deadline: string;
  progress: number;
  daysLeft?: number;
  score?: number;
  examOnly: boolean;
  /** SCORM paketi eğitim mi — backend `scormEntryPoint != null`. Kartta rozet için. */
  isScorm?: boolean;
  questionCount: number;
  examDurationMinutes: number | null;
  passingScore: number;
};

export type MyTrainingsResponse = {
  data: MyTrainingItem[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type TrainingVideo = {
  id: string;
  title: string;
  /** "MM:SS" formatında — backend hazırlıyor. */
  duration: string;
  completed: boolean;
};

export type Certificate = {
  id: string;
  certificateCode: string;
  issuedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  training: {
    title: string;
    category: string;
    isArchived: boolean;
  };
  score: number;
  attemptNumber: number;
};

export type CertificatesResponse = {
  total: number;
  page: number;
  limit: number;
  certificates: Certificate[];
};

/**
 * Eğitim bazlı geri bildirim (EY.FR.40) durumu — backend my-trainings/[id]
 * response'unda döner. `canSubmit && !submitted` ise feedback CTA gösterilir.
 */
export type TrainingFeedbackState = {
  formActive: boolean;
  mandatory: boolean;
  submitted: boolean;
  submittedAt: string | null;
  canSubmit: boolean;
  attemptId: string | null;
};

export type TrainingDetail = {
  id: string;
  assignmentId: string;
  title: string;
  category: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  examDuration: number | null;
  /**
   * Son sınav soru sayısı — sınav-öncesi bilgilendirmede gösterilir. Liste ile tutarlı.
   * Optional: güncelleme öncesi persisted cache (24h) alanı içermez — UI null-check
   * ile '—' fallback göstermeli, yoksa ekranda "undefined" yazar.
   */
  questionCount?: number;
  status: AssignmentStatus;
  currentAttempt: number;
  deadline: string;
  preExamScore?: number;
  lastAttemptScore?: number;
  examOnly: boolean;
  /**
   * SCORM paketi eğitim mi (backend `scormEntryPoint != null`). True ise mobil
   * normal pre/video/post akışı yerine WebView SCORM oynatıcısına yönlendirir.
   * Optional: eski persisted cache (24h) alanı içermeyebilir.
   */
  isScorm?: boolean;
  /** SCORM paketinin başlangıç dosyası (content route'una göre relative). isScorm ise dolu. */
  scormEntryPoint?: string | null;
  isExpired: boolean;
  startDate: string | null;
  isNotStarted: boolean;
  preExamCompleted: boolean;
  videosCompleted: boolean;
  postExamCompleted: boolean;
  needsRetry: boolean;
  /**
   * Önceki deneme cron ile expire oldu AMA son tarih geçmedi ve hak var —
   * personel BAŞTAN başlayabilir (ilerleme taşınmaz). isExpired ile karşılıklı
   * dışlayıcıdır. Optional: eski backend sürümü alanı döndürmeyebilir.
   */
  isExpiredRetryable?: boolean;
  /** Optional: eski backend sürümü döndürmeyebilir — UI `?.` ile okumalı. */
  feedback?: TrainingFeedbackState;
  videos: TrainingVideo[];
};

/** Ek deneme hakkı talebi — `/api/staff/attempt-requests`. */
export type AttemptRequestStatus = 'pending' | 'approved' | 'rejected';

export type AttemptRequest = {
  id: string;
  trainingId: string;
  reason: string | null;
  status: AttemptRequestStatus;
  grantedAttempts: number | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  training: { title: string };
};

export type AttemptRequestsResponse = {
  requests: AttemptRequest[];
};

export type CreateAttemptRequestResponse = {
  message: string;
  request: { id: string; status: AttemptRequestStatus; createdAt: string };
};
