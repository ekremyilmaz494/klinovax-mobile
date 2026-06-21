import { reviewIntervalLabel } from '../review-format';

describe('reviewIntervalLabel', () => {
  it('kutu 0 (yanlış) → yakında tekrar', () => {
    expect(reviewIntervalLabel(0)).toBe('yakında tekrar');
  });

  it('kutu 1 → yarın tekrar (1 gün)', () => {
    expect(reviewIntervalLabel(1)).toBe('yarın tekrar');
  });

  it('kutu 2..5 → "N gün sonra tekrar" (Leitner tablosu [3,7,16,35])', () => {
    expect(reviewIntervalLabel(2)).toBe('3 gün sonra tekrar');
    expect(reviewIntervalLabel(3)).toBe('7 gün sonra tekrar');
    expect(reviewIntervalLabel(4)).toBe('16 gün sonra tekrar');
    expect(reviewIntervalLabel(5)).toBe('35 gün sonra tekrar');
  });

  it('sınır dışı/bozuk kutu güvenle clamp edilir', () => {
    expect(reviewIntervalLabel(99)).toBe('35 gün sonra tekrar'); // MAX_BOX
    expect(reviewIntervalLabel(-3)).toBe('yakında tekrar'); // 0'a clamp
    expect(reviewIntervalLabel(Number.NaN)).toBe('yakında tekrar');
    expect(reviewIntervalLabel(2.4)).toBe('3 gün sonra tekrar'); // yuvarlama
  });
});
