import { smgActivityTypeLabel, smgStatusMeta } from '../labels';

describe('smgActivityTypeLabel (web paritesi)', () => {
  it('bilinen tipleri Türkçe etikete çevirir', () => {
    expect(smgActivityTypeLabel('EXTERNAL_TRAINING')).toBe('Harici Eğitim');
    expect(smgActivityTypeLabel('CONFERENCE')).toBe('Konferans');
    expect(smgActivityTypeLabel('PUBLICATION')).toBe('Yayın');
    expect(smgActivityTypeLabel('COURSE_COMPLETION')).toBe('Kurs Tamamlama');
  });

  it('bilinmeyen tip → ham string', () => {
    expect(smgActivityTypeLabel('WEBINAR')).toBe('WEBINAR');
  });
});

describe('smgStatusMeta', () => {
  it('durum → label + tone', () => {
    expect(smgStatusMeta('APPROVED')).toEqual({ label: 'Onaylandı', tone: 'success' });
    expect(smgStatusMeta('PENDING')).toEqual({ label: 'Bekliyor', tone: 'warning' });
    expect(smgStatusMeta('REJECTED')).toEqual({ label: 'Reddedildi', tone: 'danger' });
  });

  it('bilinmeyen durum → ham string + neutral', () => {
    expect(smgStatusMeta('CANCELLED')).toEqual({ label: 'CANCELLED', tone: 'neutral' });
  });
});
