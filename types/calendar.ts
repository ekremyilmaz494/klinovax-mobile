/**
 * Personel takvim tipleri — `GET /api/staff/calendar?month=YYYY-MM` ile senkron.
 * Backend DB 'passed' durumunu UI 'completed'a normalize eder.
 */

export type CalendarEventStatus = 'assigned' | 'in_progress' | 'completed' | 'failed' | 'locked';

export type CalendarEventType = 'training' | 'exam';

export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO 8601 başlangıç (atama/erişim tarihi). */
  start: string;
  /** ISO 8601 bitiş (son tarih). */
  end: string;
  category: string | null;
  status: CalendarEventStatus;
  /** Dokununca yönlendirilecek eğitim id'si. */
  trainingId: string;
  eventType: CalendarEventType;
};

export type CalendarResponse = {
  events: CalendarEvent[];
  total: number;
};
