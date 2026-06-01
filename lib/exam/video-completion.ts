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
 */
export function shouldCompleteVideo({
  accumulated,
  durationSeconds,
  alreadyCompleted,
  isPending,
}: {
  accumulated: number;
  durationSeconds: number;
  alreadyCompleted: boolean;
  isPending: boolean;
}): boolean {
  if (alreadyCompleted || isPending || !durationSeconds) return false;
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
