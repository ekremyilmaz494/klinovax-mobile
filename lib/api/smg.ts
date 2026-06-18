import { apiFetch } from './client';
import {
  smgActivityResponseSchema,
  smgCategoriesResponseSchema,
  smgMyPointsResponseSchema,
} from './schemas/smg';
import { validate } from './schemas/index';
import type {
  CreateSmgActivityBody,
  SmgActivity,
  SmgCategoriesResponse,
  SmgMyPointsResponse,
} from '@/types/smg';

/** SMG puan özeti + aktivite log'u. `periodId` boşsa backend aktif dönemi seçer. */
export async function fetchSmgPoints(periodId?: string): Promise<SmgMyPointsResponse> {
  const qs = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
  const data = await apiFetch<SmgMyPointsResponse>(`/api/staff/smg/my-points${qs}`);
  return validate(smgMyPointsResponseSchema, data, 'staff.smgPoints');
}

/**
 * Aktivite kategorileri (manuel ekleme dropdown'u). KRİTİK: path `/api/admin/...`
 * ama route staff rolüne AÇIK (withApiHandler roles: admin/staff/super_admin);
 * staff yalnız isActive=true kategorileri görür. Mobil bunu olduğu gibi çağırır.
 */
export async function fetchSmgCategories(): Promise<SmgCategoriesResponse> {
  const data = await apiFetch<SmgCategoriesResponse>('/api/admin/smg/categories');
  return validate(smgCategoriesResponseSchema, data, 'staff.smgCategories');
}

/**
 * Manuel SMG aktivitesi ekle — PENDING oluşur, admin onaylar. Backend unique key
 * (userId+activityType+title+completionDate) çift kaydı engeller (retry güvenli).
 * smgPoints kategori maxPointsPerActivity'sini aşarsa 400; kategori aktif değilse 404.
 */
export async function createSmgActivity(body: CreateSmgActivityBody): Promise<SmgActivity> {
  const data = await apiFetch<SmgActivity>('/api/staff/smg/activities', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(smgActivityResponseSchema, data, 'staff.smgActivityCreate') as SmgActivity;
}
