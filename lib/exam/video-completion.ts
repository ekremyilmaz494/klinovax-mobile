/**
 * Video tamamlama saf mantığı — `app/exam/[assignmentId]/videos.tsx`'in
 * `tryComplete` + watchedTime hesabından extract edildi.
 *
 * Backend (videos/route.ts) ile bire bir: bir video ANCAK izlenen süre
 * `durationSeconds * 0.9` (ANTI_CHEAT_WATCH_FLOOR) eşiğini geçtiğinde
 * `completed: true` kabul eder. Eşik DB duration'ı üzerinden hesaplanır —
 * player metadata'sından sapması sessiz redde yol açar.
 */

/** Backend videos/route.ts ile senkron tutulmalı; değişirse iki tarafta da güncelle. */
export const ANTI_CHEAT_WATCH_FLOOR = 0.9;

/**
 * Bir videonun tamamlanmış sayılıp completion POST'unun atılması gerekip
 * gerekmediği. `accumulated` yalnızca play state'inde geçen gerçek izleme
 * süresidir (skip-to-end exploit'i bu yüzden tetiklemez).
 *
 * `reachedEnd` (web onEnded paritesi): video DOĞAL olarak sonuna geldi. İleri
 * sarma engelli (clampSeekTarget + nativeControls=false) olduğu için sona gelmek
 * videonun gerçekten izlendiği anlamına gelir — bu durumda accumulated eşiği
 * ARANMAZ. Sebep: accumulated 5sn tick'le güncelleniyor ve video bitince oynatma
 * durduğu an son dilim eklenmiyor; KISA videolarda bu, %90 eşiğini kıl payı
 * kaçırıp tamamlamayı hiç tetiklememeye (kullanıcı son sınava geçemeden takılı
 * kalmaya) yol açıyordu. Backend yine watchedTime >= %90 istiyor;
 * buildCompletionWatchedTime taban olarak ceil(duration*0.9) gönderdiği için
 * anti-cheat zayıflamaz.
 */
export function shouldCompleteVideo({
  accumulated,
  durationSeconds,
  alreadyCompleted,
  isPending,
  reachedEnd = false,
}: {
  accumulated: number;
  durationSeconds: number;
  alreadyCompleted: boolean;
  isPending: boolean;
  reachedEnd?: boolean;
}): boolean {
  if (alreadyCompleted || isPending || !durationSeconds) return false;
  if (reachedEnd) return true;
  return accumulated >= durationSeconds * ANTI_CHEAT_WATCH_FLOOR;
}

/**
 * Completion POST'unda gönderilecek watchedTime. Math.floor yuvarlaması
 * accumulated'ı eşiğin 1sn altına düşürmesin diye `ceil(duration*0.9)` ile
 * taban alınır — aksi halde backend 200 döner ama video tamamlanmaz.
 */
export function buildCompletionWatchedTime(accumulated: number, durationSeconds: number): number {
  return Math.max(Math.floor(accumulated), Math.ceil(durationSeconds * ANTI_CHEAT_WATCH_FLOOR));
}

/**
 * Ekrandan çıkış / arka plana geçişte son ilerlemenin backend'e yazılması
 * gerekip gerekmediği (web'in sendBeacon flush'ının karşılığı). Normal
 * heartbeat 10sn birikim eşiğiyle çalışır; flush bu eşiği BEKLEMEZ ama
 * son kayıttan beri hiç yeni izleme yoksa veya video zaten tamamlandıysa
 * gereksiz POST atmaz.
 */
export function shouldFlushHeartbeat({
  accumulated,
  lastSaved,
  alreadyCompleted,
}: {
  accumulated: number;
  lastSaved: number;
  alreadyCompleted: boolean;
}): boolean {
  if (alreadyCompleted) return false;
  return Math.floor(accumulated) > lastSaved;
}
