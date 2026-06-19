/**
 * Scrubber dokunma/sürükleme x koordinatını saniyeye çevir.
 *
 * ÖNEMLİ: ileri-sarma engeli BURADA DEĞİL. Bu fonksiyon yalnızca piksel→saniye
 * dönüşümü yapar; anti-cheat sınırı çağıran tarafta `clampSeekTarget` ile uygulanır
 * (lib/exam/video-seek.ts — tek invariant noktası). Böylece scrubber "ileriyi"
 * hesaplayabilir ama commit edilince geçmiş konuma sınırlanır (ileri = no-op).
 */
export function pointToSeconds(x: number, trackWidth: number, durationSeconds: number): number {
  // NaN koruması: Math.min/max NaN'ı YAYAR (clamp etmez); jest/layout edge'inde x NaN
  // gelirse sonuç NaN olup player.currentTime=NaN'a kadar sızabilir. Sonlu değilse 0.
  if (!Number.isFinite(x) || trackWidth <= 0 || durationSeconds <= 0) return 0;
  const frac = Math.max(0, Math.min(1, x / trackWidth));
  return frac * durationSeconds;
}

/** İlerleme yüzdesi (0-100) — scrubber dolgu genişliği ve a11y değeri için. */
export function progressPercent(currentSeconds: number, durationSeconds: number): number {
  // currentSeconds metadata yüklenmeden NaN olabilir; Math.min/max NaN'ı yaymasın → 0.
  if (!Number.isFinite(currentSeconds) || durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (currentSeconds / durationSeconds) * 100));
}
