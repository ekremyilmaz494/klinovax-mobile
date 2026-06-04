import type { CalendarResponse } from '@/types/calendar';

import { apiFetch } from './client';

/**
 * Personel takvim etkinlikleri. `month` 'YYYY-MM' verildiğinde o ay döner;
 * mobil her zaman ay verir (backend month'suz ~9 aylık pencere döndürür).
 */
export function fetchCalendar(month: string): Promise<CalendarResponse> {
  return apiFetch<CalendarResponse>(`/api/staff/calendar?month=${encodeURIComponent(month)}`);
}
