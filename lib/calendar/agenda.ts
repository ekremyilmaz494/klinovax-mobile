import type { CalendarEvent } from '@/types/calendar';

/**
 * Takvim ajanda saf mantığı — `app/calendar.tsx` ekranının tarih/gruplama hesabı
 * buraya çıkarıldı (test edilen). Hiçbiri içeride `Date.now()` çağırmaz; ekran
 * `new Date()`'i state'e koyup buraya geçirir → fonksiyonlar deterministik kalır.
 */

const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/** Backend `month` query paramı: 'YYYY-MM'. */
export function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Ayı `delta` kadar kaydır; ayın 1'ine sabitlenir (31→şubat gün taşması olmaz). */
export function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/** Başlık: 'Haziran 2026'. */
export function monthLabel(d: Date): string {
  return `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

export type AgendaSection = { dayKey: string; title: string; data: CalendarEvent[] };

/**
 * Etkinlikleri başlangıç gününe göre grupla; gruplar ve grup içi etkinlikler
 * kronolojik. Gün anahtarı ISO string'in 'YYYY-MM-DD' başından alınır — gruplama
 * ile başlık aynı kaynaktan üretilir, zaman dilimi kayması yaratmaz.
 */
export function groupEventsByDay(events: CalendarEvent[]): AgendaSection[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const map = new Map<string, CalendarEvent[]>();
  for (const e of sorted) {
    const key = e.start.slice(0, 10);
    const arr = map.get(key);
    if (arr) arr.push(e);
    else map.set(key, [e]);
  }
  return Array.from(map.entries()).map(([dayKey, data]) => ({
    dayKey,
    title: formatDayTitle(dayKey),
    data,
  }));
}

/** 'YYYY-MM-DD' → 'Çarşamba, 4 Haziran' (yerel Date'ten, tz kaymasız). */
export function formatDayTitle(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { weekday: 'long' });
  return `${capitalize(weekday)}, ${d} ${MONTHS_TR[m - 1]}`;
}

function capitalize(s: string): string {
  return s.length ? s[0].toLocaleUpperCase('tr-TR') + s.slice(1) : s;
}
