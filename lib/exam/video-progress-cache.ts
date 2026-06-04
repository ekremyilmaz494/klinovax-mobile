import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Çevrimdışı video izleme ilerlemesinin YEREL önbelleği.
 *
 * NEDEN: Periyodik heartbeat çevrimdışıyken atılmaz (online dönüşte replay
 * fırtınası + 60/dk rate-limit'e çarpmasın diye — bilinçli). Çıkış/background
 * flush paused kuyruğa girer; ama uygulama ZORLA kapanırsa (AppState 'background'
 * tetiklenmeden / crash) son birikim kaybolur ve reopen'da accumulator backend'in
 * bildiği eski `watchedSeconds` ile sıfırlanır → meşru çevrimdışı izleme %90
 * tamamlama için sayılmayabilir. Birikimi yerelde tutarak force-kill sonrası
 * korur; online dönen ilk heartbeat/flush yüksek değeri TEK istekle yazar (flood yok).
 */

const PREFIX = 'klinovax:video-progress:';

export type CachedVideoProgress = { watchedSeconds: number; position: number };

function keyOf(assignmentId: string, videoId: string): string {
  return `${PREFIX}${assignmentId}:${videoId}`;
}

/**
 * Resume'da kullanılacak izleme süresi: backend ile yerel önbellekten BÜYÜK olanı.
 * Saf çekirdek (test edilen). NaN/negatif/undefined değerler 0 sayılır — bozuk
 * önbellek backend değerini asla düşürmez.
 */
export function mergeWatchedSeconds(
  backendSeconds: number,
  cachedSeconds: number | null | undefined,
): number {
  const a = Number.isFinite(backendSeconds) && backendSeconds > 0 ? backendSeconds : 0;
  const b =
    typeof cachedSeconds === 'number' && Number.isFinite(cachedSeconds) && cachedSeconds > 0
      ? cachedSeconds
      : 0;
  return Math.max(a, b);
}

export async function readVideoProgress(
  assignmentId: string,
  videoId: string,
): Promise<CachedVideoProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(assignmentId, videoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedVideoProgress>;
    const watchedSeconds = Number(parsed.watchedSeconds);
    if (!Number.isFinite(watchedSeconds)) return null;
    const position = Number(parsed.position);
    return { watchedSeconds, position: Number.isFinite(position) ? position : 0 };
  } catch {
    // Bozuk/okunamayan önbellek = önbellek yok; akış backend değeriyle devam eder.
    return null;
  }
}

export async function writeVideoProgress(
  assignmentId: string,
  videoId: string,
  value: CachedVideoProgress,
): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(assignmentId, videoId), JSON.stringify(value));
  } catch {
    // Best-effort: yazılamazsa heartbeat/flush yolu yine çalışır.
  }
}

export async function clearVideoProgress(assignmentId: string, videoId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyOf(assignmentId, videoId));
  } catch {
    // ignore
  }
}
