/**
 * Yeni şifre kuralı — backend `PATCH /api/staff/profile` ile AYNI (min 8 karakter +
 * en az bir büyük harf + en az bir rakam). Client'ta boşa istek atmadan önce uyarmak
 * için; backend yine doğrular (graceful — bu yalnız UX, güvenlik otoritesi backend).
 */

export type PasswordCheck = {
  valid: boolean;
  minLength: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
};

export function checkNewPassword(pw: string): PasswordCheck {
  const minLength = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  return { valid: minLength && hasUpper && hasDigit, minLength, hasUpper, hasDigit };
}

export type PasswordStrength = 'zayif' | 'orta' | 'guclu';

/** Görsel güç göstergesi (web'deki ZAYIF/ORTA/GÜÇLÜ karşılığı) — yalnız bilgilendirme. */
export function passwordStrength(pw: string): PasswordStrength {
  if (pw.length === 0) return 'zayif';
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'zayif';
  if (score === 3) return 'orta';
  return 'guclu';
}
