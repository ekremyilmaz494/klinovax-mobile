/**
 * Puan → seviye/ünvan eşlemesi (SAF — yan etkisiz).
 *
 * Puan sunucuda (PointLedger SUM) hesaplanır ve ASLA azalmaz; seviye yalnızca o
 * puanın GÖSTERİM katmanıdır (statü hissi + ilerleme). Eşikler şimdilik mobilde
 * tanımlı — backend ileride "level" alanı eklerse bu tablo onunla SENKRON tutulur.
 *
 * Ünvanlar hastane/eğitim bağlamına uygun, profesyonel ton (oyuncak değil).
 */

export interface LevelTier {
  level: number;
  title: string;
  /** Bu seviyeye girmek için gereken minimum puan (dahil). */
  floor: number;
}

/** Artan sıralı — `resolveLevel` bu sıraya güvenir. */
export const LEVELS: readonly LevelTier[] = [
  { level: 1, title: 'Yeni Başlayan', floor: 0 },
  { level: 2, title: 'Öğrenen', floor: 100 },
  { level: 3, title: 'Yetkin', floor: 300 },
  { level: 4, title: 'Uzman', floor: 700 },
  { level: 5, title: 'Usta', floor: 1500 },
  { level: 6, title: 'Mentor', floor: 3000 },
] as const;

export interface LevelProgress {
  level: number;
  title: string;
  /** Mevcut seviyenin taban puanı. */
  floor: number;
  /** Sonraki seviyenin taban puanı; en üst seviyede null. */
  nextFloor: number | null;
  /** Sonraki seviyeye kalan puan; en üst seviyede 0. */
  pointsToNext: number;
  /** Mevcut seviye içindeki ilerleme 0..1; en üst seviyede 1. */
  progress: number;
  /** En üst seviyeye ulaşıldı mı. */
  isMax: boolean;
}

/**
 * Verilen puana karşılık gelen seviyeyi ve sonraki seviyeye ilerlemeyi döndürür.
 * Negatif/eksik puan 0 sayılır (savunmacı — summary kırılırsa NaN sızmasın).
 */
export function resolveLevel(points: number): LevelProgress {
  const safePoints = Number.isFinite(points) && points > 0 ? points : 0;

  // En yüksek floor'u geçen seviye — LEVELS artan sıralı olduğundan son eşleşen.
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safePoints >= LEVELS[i].floor) idx = i;
    else break;
  }

  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const isMax = next === null;

  if (isMax) {
    return {
      level: current.level,
      title: current.title,
      floor: current.floor,
      nextFloor: null,
      pointsToNext: 0,
      progress: 1,
      isMax: true,
    };
  }

  const span = next.floor - current.floor;
  const into = safePoints - current.floor;
  return {
    level: current.level,
    title: current.title,
    floor: current.floor,
    nextFloor: next.floor,
    pointsToNext: Math.max(0, next.floor - safePoints),
    // span > 0 garanti (floor'lar kesin artan) ama defansif clamp.
    progress: span > 0 ? Math.min(1, Math.max(0, into / span)) : 1,
    isMax: false,
  };
}
