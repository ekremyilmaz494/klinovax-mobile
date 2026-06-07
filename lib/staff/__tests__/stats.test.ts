import type { MyTrainingItem } from '@/types/staff';

import { computeAverageScore } from '../stats';

/** Test için yalnız `score` alanı anlamlı; gerisini minimal doldur. */
function item(score?: number): MyTrainingItem {
  return {
    id: Math.random().toString(36),
    title: 'x',
    category: '',
    status: 'passed',
    attempt: 1,
    maxAttempts: 3,
    startDate: null,
    isNotStarted: false,
    deadline: '',
    progress: 100,
    score,
    examOnly: false,
    questionCount: 0,
    examDurationMinutes: null,
    passingScore: 70,
  };
}

describe('computeAverageScore — web personel paneliyle parite', () => {
  it('skorlu kayıt yoksa null', () => {
    expect(computeAverageScore([])).toBeNull();
    expect(computeAverageScore([item(undefined), item(undefined)])).toBeNull();
  });

  it('ortalamayı tam sayıya yuvarlar', () => {
    // (80 + 91) / 2 = 85.5 → 86
    expect(computeAverageScore([item(80), item(91)])).toBe(86);
  });

  it('skorsuz (undefined) kayıtları ortalamaya katmaz', () => {
    // sadece 90 ve 70 sayılır → 80
    expect(computeAverageScore([item(90), item(undefined), item(70)])).toBe(80);
  });

  it('sıfır skoru truthy filtresiyle dışarıda bırakır (web ile aynı)', () => {
    // 0 düşer, yalnız 100 kalır → 100 (boş değil)
    expect(computeAverageScore([item(0), item(100)])).toBe(100);
    // sadece 0'lar → skorlu sayılmaz → null
    expect(computeAverageScore([item(0), item(0)])).toBeNull();
  });
});
