import type { CalendarEvent } from '@/types/calendar';

import { groupEventsByDay, monthLabel, monthParam, shiftMonth, upcomingSections } from '../agenda';

function ev(partial: Partial<CalendarEvent> & { id: string; start: string }): CalendarEvent {
  return {
    title: 'Eğitim',
    end: partial.start,
    category: null,
    status: 'assigned',
    trainingId: 't1',
    eventType: 'training',
    ...partial,
  };
}

describe('monthParam', () => {
  it("ayı sıfır dolgulu 'YYYY-MM' verir", () => {
    expect(monthParam(new Date(2026, 0, 15))).toBe('2026-01');
    expect(monthParam(new Date(2026, 11, 1))).toBe('2026-12');
  });
});

describe('shiftMonth', () => {
  it("ileri/geri kaydırır ve ayın 1'ine sabitler", () => {
    expect(monthParam(shiftMonth(new Date(2026, 5, 20), 1))).toBe('2026-07');
    expect(monthParam(shiftMonth(new Date(2026, 0, 31), -1))).toBe('2025-12');
  });

  it('yıl sınırını doğru aşar', () => {
    expect(monthParam(shiftMonth(new Date(2026, 11, 10), 1))).toBe('2027-01');
  });

  it("31 Ocak'tan +1 ay şubat gün taşması yaratmaz (ayın 1'ine sabit)", () => {
    const next = shiftMonth(new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1); // Şubat
    expect(next.getDate()).toBe(1);
  });
});

describe('monthLabel', () => {
  it('Türkçe ay + yıl', () => {
    expect(monthLabel(new Date(2026, 5, 1))).toBe('Haziran 2026');
  });
});

describe('groupEventsByDay', () => {
  it('güne göre gruplar ve kronolojik sıralar', () => {
    const sections = groupEventsByDay([
      ev({ id: 'b', start: '2026-06-05T09:00:00.000Z' }),
      ev({ id: 'a', start: '2026-06-04T10:00:00.000Z' }),
      ev({ id: 'c', start: '2026-06-05T08:00:00.000Z' }),
    ]);
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-06-04', '2026-06-05']);
    // 05 günü içinde 08:00 (c) 09:00'dan (b) önce gelmeli
    expect(sections[1].data.map((e) => e.id)).toEqual(['c', 'b']);
  });

  it('boş liste boş döner', () => {
    expect(groupEventsByDay([])).toEqual([]);
  });

  it('orijinal diziyi mutasyona uğratmaz', () => {
    const input = [ev({ id: 'a', start: '2026-06-05T09:00:00.000Z' })];
    groupEventsByDay(input);
    expect(input[0].id).toBe('a');
  });
});

describe('upcomingSections', () => {
  const events = [
    ev({ id: 'past', start: '2026-06-02T09:00:00.000Z' }),
    ev({ id: 'today', start: '2026-06-04T09:00:00.000Z' }),
    ev({ id: 'next', start: '2026-06-06T09:00:00.000Z' }),
    ev({ id: 'later', start: '2026-06-09T09:00:00.000Z' }),
  ];

  it('bugünden önceki günleri eler', () => {
    const sections = upcomingSections(events, '2026-06-04', 10);
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-06-04', '2026-06-06', '2026-06-09']);
  });

  it('maxGroups ile grup sayısını sınırlar', () => {
    const sections = upcomingSections(events, '2026-06-04', 2);
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-06-04', '2026-06-06']);
  });

  it('hepsi geçmişse boş döner', () => {
    expect(upcomingSections(events, '2026-07-01', 5)).toEqual([]);
  });
});
