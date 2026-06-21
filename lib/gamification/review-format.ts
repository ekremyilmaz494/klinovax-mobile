import { LEITNER_INTERVALS_DAYS, MAX_BOX } from '@/lib/exam/spaced-repetition';

/**
 * Leitner kutusu → "ne zaman tekrar" Türkçe etiketi (SAF). Günün Soruları sonuç
 * ekranında her sorunun bir sonraki tekrar zamanını kullanıcıya açıklar — aralıklı
 * tekrar mantığını görünür kılar (eğitsel: "doğru bildikçe daha seyrek sorulur").
 *
 * Aralık tablosu sunucu ile aynı (LEITNER_INTERVALS_DAYS); kutu sınır dışıysa clamp.
 */
export function reviewIntervalLabel(box: number): string {
  const safeBox = Math.max(0, Math.min(MAX_BOX, Math.round(box || 0)));
  const days = LEITNER_INTERVALS_DAYS[safeBox];
  if (days <= 0) return 'yakında tekrar'; // kutu 0 (yanlış) → bir sonraki turda
  if (days === 1) return 'yarın tekrar';
  return `${days} gün sonra tekrar`;
}
