import { apiFetch } from './client';
import {
  certificatesResponseSchema,
  dashboardResponseSchema,
  myTrainingsResponseSchema,
  staffProfileSchema,
  trainingDetailSchema,
} from './schemas/staff';
import { validate } from './schemas/index';
import type {
  AssignmentStatus,
  CertificatesResponse,
  DashboardResponse,
  MyTrainingsResponse,
  StaffProfile,
  TrainingDetail,
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
}): Promise<MyTrainingsResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  const data = await apiFetch<MyTrainingsResponse>(`/api/staff/my-trainings?${qs.toString()}`);
  return validate(myTrainingsResponseSchema, data, 'staff.myTrainings');
}
