import { API_BASE_URL } from '@/lib/config';

import { ApiError, apiFetch } from './client';

/**
 * Auth aksiyonları — login/refresh `client.ts`'te; bunlar şifre yaşam döngüsü.
 *
 * - `requestPasswordReset`: oturum YOK iken çağrılır → `apiFetch` (Bearer ister) DEĞİL,
 *   `loginRequest` gibi token'sız düz fetch.
 * - `changePassword`: oturum VAR iken (zorunlu değişim ekranı) → `apiFetch`, 401→refresh otomatik.
 *   Backend bu endpoint'te `mustChangePassword` bayrağını da temizler (`/api/staff/profile` temizlemez).
 */

/** POST /api/auth/forgot-password — sıfırlama e-postasını tetikler (link web'de açılır). */
export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, body ?? { error: `HTTP ${res.status}` });
  return (body as { success: boolean; message?: string }) ?? { success: true };
}

/** POST /api/auth/change-password — mevcut şifreyi doğrular, yenisini yazar, mustChangePassword'ü temizler. */
export async function changePassword(params: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
