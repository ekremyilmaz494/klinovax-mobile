import { apiFetch } from './client';
import { notificationsResponseSchema } from './schemas/notifications';
import { validate } from './schemas/index';
import type { NotificationsResponse } from '@/types/notifications';

/**
 * Staff bildirim feed çağrıları — backend `/api/staff/notifications`.
 *
 * Backend zaten son 50 kayıtla sınırlı (hardcoded `take: 50`) ve sistem
 * tipleri (`exam_passed`/`exam_failed`/`exam_started`/`training_assigned`)
 * server-side filtreli. Mobile pagination Hafta 9 polish.
 */

export async function fetchNotifications(opts?: {
  unread?: boolean;
}): Promise<NotificationsResponse> {
  const qs = opts?.unread ? '?unread=true' : '';
  const data = await apiFetch<NotificationsResponse>(`/api/staff/notifications${qs}`);
  return validate(notificationsResponseSchema, data, 'staff.notifications');
}

export function markNotificationRead(id: string): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(`/api/staff/notifications?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead(): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(`/api/staff/notifications`, { method: 'PATCH' });
}
