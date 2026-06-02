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
 * Timer'ın bitiş zaman damgası (ms). Öncelik sırası:
 *
 *   1. `expiresAt` — sunucu mutlak bitiş zamanı (Redis miss → DB recovery path'i döner).
 *   2. `remainingSeconds` — Redis canlı sayaç path'i `expiresAt` DÖNMEZ, sadece kalan
 *      saniyeyi döner (timer/route.ts). Resume'daki gerçek kalan süre budur; bu
 *      olmadan fallback'e düşmek kill/reopen sonrası sayacı tam süreye sıfırlar.
 *   3. `fallbackTotalTimeSeconds` — ikisi de yoksa (eski backend) iyimser client
 *      fallback; backend submit'i +5dk grace ile enforce ettiği için kullanıcı bu
 *      yolla ekstra süre kazanamaz.
 *
 * Sunucu değerleri geçmişte kalmış olsa bile kullanılır (kalan 0 → auto-submit).
 */
export function resolveTimerEndMs({
  expiresAt,
  remainingSeconds,
  fallbackTotalTimeSeconds,
  nowMs,
}: {
  expiresAt: number | null | undefined;
  remainingSeconds: number | null | undefined;
  fallbackTotalTimeSeconds: number;
  nowMs: number;
}): number {
  if (typeof expiresAt === 'number') return expiresAt;
  if (typeof remainingSeconds === 'number') return nowMs + remainingSeconds * 1000;
  return nowMs + fallbackTotalTimeSeconds * 1000;
}
