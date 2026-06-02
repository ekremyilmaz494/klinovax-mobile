/**
 * Sınav timer saf mantığı — `app/exam/[assignmentId]/questions.tsx`'in
 * `ExamTimer` interval'inden extract edildi.
 */

/**
 * Süre sıfıra düştüğünde otomatik submit tetiklenmeli mi. `alreadySubmitted`
 * guard'ı çoklu interval tick'inde tekrar submit'i engeller (idempotence).
 */
export function shouldAutoSubmitTimer({
  remaining,
  alreadySubmitted,
}: {
  remaining: number;
  alreadySubmitted: boolean;
}): boolean {
  return remaining <= 0 && !alreadySubmitted;
}

/**
 * Bitiş zaman damgasından (ms) kalan saniye. Ekrandaki hesapla bire bir:
 * `Math.max(0, Math.ceil((endMs - nowMs) / 1000))` — negatife düşmez (clamp),
 * yukarı yuvarlanır (sayaç son saniyeyi 1'de değil 0'da bitirsin).
 */
export function computeRemainingSeconds(endMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
}

/**
 * Timer'ın bitiş zaman damgası (ms). Sunucu `expiresAt` değeri varsa HER ZAMAN
 * o kullanılır — kill/reopen sonrası kalan gerçek süre budur; geçmişte kalmışsa
 * bile fallback'e düşülmez (kalan 0 → auto-submit tetiklenir). Sunucu değeri
 * yoksa (Redis düşmüş / eski backend) client-side iyimser fallback kurulur;
 * backend submit'i +5dk grace ile zaten enforce ettiği için kullanıcı bu yolla
 * ekstra süre kazanamaz.
 */
export function resolveTimerEndMs({
  expiresAt,
  fallbackTotalTimeSeconds,
  nowMs,
}: {
  expiresAt: number | null | undefined;
  fallbackTotalTimeSeconds: number;
  nowMs: number;
}): number {
  if (typeof expiresAt === 'number') return expiresAt;
  return nowMs + fallbackTotalTimeSeconds * 1000;
}
