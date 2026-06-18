/**
 * SMG / CPD (Sürekli Mesleki Gelişim) puan sistemi — `/api/staff/smg/*`.
 * Sınav geçince backend otomatik APPROVED aktivite ekler; personel ayrıca manuel
 * aktivite ekleyebilir (PENDING → admin onayı). Aktif dönem yoksa `period: null`.
 */

export type SmgActivityType =
  | 'EXTERNAL_TRAINING'
  | 'CONFERENCE'
  | 'PUBLICATION'
  | 'COURSE_COMPLETION';

export type SmgApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type SmgActivity = {
  id: string;
  title: string;
  /** Backend `varchar` — bilinen tipler SmgActivityType, gevşek string fallback. */
  activityType: string;
  completionDate: string;
  smgPoints: number;
  approvalStatus: SmgApprovalStatus;
  provider: string | null;
  rejectionReason: string | null;
  createdAt?: string;
};

export type SmgPeriodLite = { id: string; name: string; isActive: boolean };

export type SmgMyPointsResponse = {
  /** Aktif (veya seçili) dönem; org'da SMG dönemi yoksa null → modül gizlenir. */
  period: { id: string; name: string; requiredPoints: number; endDate: string } | null;
  periods: SmgPeriodLite[];
  approvedPoints: number;
  pendingPoints: number;
  requiredPoints: number;
  remainingPoints: number;
  daysLeft: number | null;
  progress: number;
  approvedActivities: SmgActivity[];
  pendingActivities: SmgActivity[];
  rejectedActivities: SmgActivity[];
};

export type SmgCategory = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  maxPointsPerActivity: number | null;
  isActive: boolean;
  sortOrder: number;
};

export type SmgCategoriesResponse = { categories: SmgCategory[] };

export type CreateSmgActivityBody = {
  categoryId: string;
  title: string;
  provider?: string;
  completionDate: string;
  smgPoints: number;
  certificateUrl?: string;
};
