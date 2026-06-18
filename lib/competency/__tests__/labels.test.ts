import { evaluationStatusMeta, evaluatorTypeLabel } from '../labels';

describe('evaluatorTypeLabel (web paritesi)', () => {
  it('bilinen değerlendirici tiplerini Türkçe etikete çevirir', () => {
    expect(evaluatorTypeLabel('SELF')).toBe('Öz değerlendirme');
    expect(evaluatorTypeLabel('MANAGER')).toBe('Yönetici');
    expect(evaluatorTypeLabel('PEER')).toBe('Akran');
    expect(evaluatorTypeLabel('SUBORDINATE')).toBe('Ast');
  });

  it('bilinmeyen tip → ham string', () => {
    expect(evaluatorTypeLabel('EXTERNAL')).toBe('EXTERNAL');
  });
});

describe('evaluationStatusMeta', () => {
  it('durum → label + tone', () => {
    expect(evaluationStatusMeta('COMPLETED')).toEqual({ label: 'Tamamlandı', tone: 'success' });
    expect(evaluationStatusMeta('PENDING')).toEqual({ label: 'Bekliyor', tone: 'warning' });
  });

  it('bilinmeyen durum → ham string + neutral', () => {
    expect(evaluationStatusMeta('DRAFT')).toEqual({ label: 'DRAFT', tone: 'neutral' });
  });
});
