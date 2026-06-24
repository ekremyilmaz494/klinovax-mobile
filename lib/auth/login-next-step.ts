import type { loginRequest } from '@/lib/api/client';

type LoginResponse = Awaited<ReturnType<typeof loginRequest>>;

/**
 * Login yanıtının kullanıcıyı götürdüğü sıradaki adım. Login ekranı bu ayrımı
 * okuyup yan etkilere (org-picker göster / uyarı / setSession) dallanır.
 */
export type LoginStep =
  | { kind: 'mfa' }
  | { kind: 'smsMfa'; phoneMasked: string | null }
  | { kind: 'blocked' }
  | { kind: 'session' };

/**
 * Login yanıtını sıradaki adıma çevirir — SAF, yan etkisiz.
 *
 * Sıra backend/web client gating'iyle birebir:
 *   mfa → smsMfa → (session yoksa) blocked → session
 *
 * Not: Tek-org politikası gereği çoklu-org seçimi (orgPick) YOK; TC birden fazla
 * kuruma bağlıysa backend 409 döner ve login ekranı hatayı gösterir.
 *
 * `blocked`: session yok ama bilinen bir gate de değil → mobil akışın
 * desteklemediği bir ek doğrulama (kullanıcıya "web'den giriş" denir).
 */
export function resolveLoginStep(res: LoginResponse): LoginStep {
  if (res.mfaRequired) return { kind: 'mfa' };
  if (res.smsMfaRequired) return { kind: 'smsMfa', phoneMasked: res.phoneMasked ?? null };
  if (!res.session) return { kind: 'blocked' };
  return { kind: 'session' };
}
