/**
 * Spaced-repetition (Leitner) saf mantığı — "Günün Soruları" modülünün
 * planlama çekirdeği.
 *
 * Backend (daily/route.ts) ile bire bir: due-soru SEÇİMİ sunucuda yapılır
 * (anti-cheat — cihaz saati ile manipülasyon engellenir). Bu modül client
 * tarafında gösterim/yardımcı hesaplar ve kutu→aralık tablosunun iki tarafta
 * senkron kaldığını ispatlayan regresyon kilidi olarak durur. Tablo değişirse
 * backend daily_review zamanlamasıyla birlikte güncellenmeli.
 *
 * Saf: import yok, React yok, yan etki yok — girdileri mutate etmez.
 */

/**
 * Leitner kutu → tekrar aralığı (gün). Kutu indeksi 0..5; doğru cevaplandıkça
 * soru üst kutuya çıkar ve aralık uzar, yanlışta kutu 0'a düşer (sık tekrar).
 * Backend daily_review.next_review_at hesabıyla senkron tutulmalı.
 */
export const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35] as const;

/** En üst Leitner kutusu (tablo uzunluğundan türer). */
export const MAX_BOX = LEITNER_INTERVALS_DAYS.length - 1;

/**
 * Bir cevap sonrası sorunun yeni Leitner kutusu. Doğru → bir üst kutu (MAX_BOX
 * tavanında kalır), yanlış → kutu 0 (en sık tekrar). Aralık dışı `currentBox`
 * defansif olarak geçerli aralığa kıstırılır.
 */
export function nextBox({ currentBox, correct }: { currentBox: number; correct: boolean }): number {
  const box = clampBox(currentBox);
  if (!correct) return 0;
  return Math.min(box + 1, MAX_BOX);
}

/**
 * Sorunun bir sonraki tekrar tarihi: `from` + kutuya karşılık gelen gün sayısı.
 * Yerel saat-dilimi gün ekleme (setDate) kullanılır → DST geçişlerinde aynı
 * duvar-saati korunur. `from` mutate edilmez; yeni bir Date döner.
 */
export function nextReviewDate({ box, from }: { box: number; from: Date }): Date {
  const days = LEITNER_INTERVALS_DAYS[clampBox(box)];
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Sorunun bugün tekrar edilmesi gerekip gerekmediği (vadesi gelmiş mi). */
export function isDue({ nextReviewAt, now }: { nextReviewAt: Date; now: Date }): boolean {
  return now.getTime() >= nextReviewAt.getTime();
}

/**
 * Bugün gösterilecek soruları seçer: vadesi gelmiş olanları en eski vadeden
 * başlayarak sıralar ve `limit` kadar keser. Girdi `pool` mutate edilmez.
 * (Gerçek seçim backend'de yapılır; bu, offline/yerel gösterim ve test içindir.)
 */
export function selectTodaysQuestions<T extends { nextReviewAt: Date }>({
  pool,
  now,
  limit,
}: {
  pool: T[];
  now: Date;
  limit: number;
}): T[] {
  return pool
    .filter((item) => isDue({ nextReviewAt: item.nextReviewAt, now }))
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())
    .slice(0, Math.max(0, Math.trunc(limit)));
}

/** Kutu indeksini [0, MAX_BOX] aralığına ve tam sayıya kıstırır. */
function clampBox(box: number): number {
  return Math.min(Math.max(Math.trunc(box), 0), MAX_BOX);
}
