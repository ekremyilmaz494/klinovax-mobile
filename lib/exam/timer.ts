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
