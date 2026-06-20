import type { loginRequest } from '@/lib/api/client';

type LoginResponse = Awaited<ReturnType<typeof loginRequest>>;

/**
 * Login yanıtının kullanıcıyı götürdüğü sıradaki adım. Login ekranı bu ayrımı
 * okuyup yan etkilere (org-picker göster / uyarı / setSession) dallanır.
 */
export type LoginStep =
  | { kind: 'orgPick'; orgs: { slug: string; name: string }[] }
  | { kind: 'mfa' }
  | { kind: 'smsMfa'; phoneMasked: string | null }
  | { kind: 'blocked' }
  | { kind: 'session' };

/**
 * Login yanıtını sıradaki adıma çevirir — SAF, yan etkisiz.
 *
 * Sıra backend/web client gating'iyle birebir:
 *   orgPick → mfa → smsMfa → (session yoksa) blocked → session
 *
 * `blocked`: session yok ama bilinen bir gate de değil → mobil akışın
 * desteklemediği bir ek doğrulama (kullanıcıya "web'den giriş" denir).
 */
export function resolveLoginStep(res: LoginResponse): LoginStep {
  if (res.orgPickRequired && res.orgs && res.orgs.length > 0) {
    return { kind: 'orgPick', orgs: res.orgs };
  }
  if (res.mfaRequired) return { kind: 'mfa' };
  if (res.smsMfaRequired) return { kind: 'smsMfa', phoneMasked: res.phoneMasked ?? null };
  if (!res.session) return { kind: 'blocked' };
  return { kind: 'session' };
}
