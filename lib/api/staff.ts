import { apiFetch } from './client';
import {
  certificatesResponseSchema,
  dashboardResponseSchema,
  myTrainingsResponseSchema,
  profileUpdateResponseSchema,
  staffProfileSchema,
  trainingDetailSchema,
  trainingPeriodsResponseSchema,
} from './schemas/staff';
import { validate } from './schemas/index';
import type {
  AssignmentStatus,
  CertificatesResponse,
  DashboardResponse,
  MyTrainingsResponse,
  StaffProfile,
  StaffProfileUpdate,
  TrainingDetail,
  TrainingPeriodsResponse,
} from '@/types/staff';

/**
 * Personel paneli (`/api/staff/*`) okuma çağrıları — hepsi `validate()` ile sarılı.
 * Eskiden ekran içinde inline `apiFetch` ile çağrılıyordu (runtime guard YOKTU);
 * named fetcher'a taşıyarak kontrat drift'ini tek noktada loglanır yapıyoruz. queryKey'ler
 * ekranlarda DEĞİŞMEDEN kalır (cache/invalidate kırılmasın).
 */

export async function fetchDashboard(): Promise<DashboardResponse> {
  const data = await apiFetch<DashboardResponse>('/api/staff/dashboard');
  return validate(dashboardResponseSchema, data, 'staff.dashboard');
}

export async function fetchStaffProfile(): Promise<StaffProfile> {
  const data = await apiFetch<StaffProfile>('/api/staff/profile');
  return validate(staffProfileSchema, data, 'staff.profile');
}

export async function fetchCertificates(opts?: {
  page?: number;
  limit?: number;
}): Promise<CertificatesResponse> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const data = await apiFetch<CertificatesResponse>(
    `/api/staff/certificates?page=${page}&limit=${limit}`,
  );
  return validate(certificatesResponseSchema, data, 'staff.certificates');
}

export async function fetchTrainingDetail(id: string): Promise<TrainingDetail> {
  const data = await apiFetch<TrainingDetail>(`/api/staff/my-trainings/${id}`);
  return validate(trainingDetailSchema, data, 'staff.trainingDetail');
}

export async function fetchMyTrainings(params: {
  page: number;
  limit: number;
  status?: AssignmentStatus;
  /** Geçmiş dönem görüntüleme; boş/undefined → backend aktif dönemi seçer. */
  periodId?: string;
}): Promise<MyTrainingsResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.periodId) qs.set('periodId', params.periodId);
  const data = await apiFetch<MyTrainingsResponse>(`/api/staff/my-trainings?${qs.toString()}`);
  return validate(myTrainingsResponseSchema, data, 'staff.myTrainings');
}

/** Eğitim dönemleri (year DESC) — dönem seçici için. */
export async function fetchTrainingPeriods(): Promise<TrainingPeriodsResponse> {
  const data = await apiFetch<TrainingPeriodsResponse>('/api/staff/training-periods');
  return validate(trainingPeriodsResponseSchema, data, 'staff.trainingPeriods');
}

/**
 * Profil/şifre güncelleme — `PATCH /api/staff/profile`. Yalnız gönderilen alanlar yazılır.
 * Şifre değişiminde `currentPassword` + `newPassword` birlikte gönderilir (backend min 8 +
 * büyük harf + rakam ve mevcut şifre doğrulaması yapar; hatalar 400/429 ile döner — çağıran
 * Alert ile gösterir). Offline-resume DEĞİL: kullanıcı sonucu canlı görmeli, şifre kuyruğa alınmaz.
 */
export async function updateStaffProfile(body: StaffProfileUpdate): Promise<{ success: true }> {
  const data = await apiFetch<{ success: true }>('/api/staff/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return validate(profileUpdateResponseSchema, data, 'staff.profileUpdate');
}
