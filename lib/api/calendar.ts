import { apiFetch } from './client';
import { calendarResponseSchema } from './schemas/calendar';
import { validate } from './schemas/index';
import type { CalendarResponse } from '@/types/calendar';

/**
 * Personel takvim etkinlikleri. `month` 'YYYY-MM' verildiğinde o ay döner;
 * mobil her zaman ay verir (backend month'suz ~9 aylık pencere döndürür).
 */
export async function fetchCalendar(month: string): Promise<CalendarResponse> {
  const data = await apiFetch<CalendarResponse>(
    `/api/staff/calendar?month=${encodeURIComponent(month)}`,
  );
  return validate(calendarResponseSchema, data, 'staff.calendar');
}
