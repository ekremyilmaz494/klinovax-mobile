/**
 * Backend `/api/staff/*` response tipleri.
 * Web'deki Prisma modellerinden türetilen Zod şemaları sonradan paylaşımlı pakete
 * taşınacak (Faz 2). Şimdilik backend route'larıyla manuel senkron tutuluyor.
 */

export type AssignmentStatus = 'assigned' | 'in_progress' | 'passed' | 'failed';

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

export type TrainingDetail = {
  id: string;
  assignmentId: string;
  title: string;
  category: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  examDuration: number | null;
  status: AssignmentStatus;
  currentAttempt: number;
  deadline: string;
  preExamScore?: number;
  lastAttemptScore?: number;
  examOnly: boolean;
  isExpired: boolean;
  startDate: string | null;
  isNotStarted: boolean;
  preExamCompleted: boolean;
  videosCompleted: boolean;
  postExamCompleted: boolean;
  needsRetry: boolean;
  videos: TrainingVideo[];
};
