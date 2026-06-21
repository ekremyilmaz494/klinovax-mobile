import { LEVELS, resolveLevel } from '../levels';

describe('resolveLevel', () => {
  it('0 puan → Seviye 1 (Yeni Başlayan)', () => {
    const r = resolveLevel(0);
    expect(r.level).toBe(1);
    expect(r.title).toBe('Yeni Başlayan');
    expect(r.isMax).toBe(false);
    expect(r.nextFloor).toBe(100);
    expect(r.pointsToNext).toBe(100);
    expect(r.progress).toBe(0);
  });

  it('eşik tam üstünde bir sonraki seviyeye geçer (100 → Seviye 2)', () => {
    const r = resolveLevel(100);
    expect(r.level).toBe(2);
    expect(r.title).toBe('Öğrenen');
    expect(r.floor).toBe(100);
    expect(r.nextFloor).toBe(300);
  });

  it('seviye ortasında ilerleme oranı doğru (200 → %50 → Seviye 3 yolunda)', () => {
    const r = resolveLevel(200);
    expect(r.level).toBe(2);
    expect(r.pointsToNext).toBe(100); // 300 - 200
    expect(r.progress).toBeCloseTo(0.5, 5); // (200-100)/(300-100)
  });

  it('en üst seviye: next yok, progress 1, pointsToNext 0', () => {
    const r = resolveLevel(5000);
    expect(r.level).toBe(LEVELS[LEVELS.length - 1].level);
    expect(r.title).toBe('Mentor');
    expect(r.isMax).toBe(true);
    expect(r.nextFloor).toBeNull();
    expect(r.pointsToNext).toBe(0);
    expect(r.progress).toBe(1);
  });

  it('tam en üst eşik (3000) en üst seviyeyi verir', () => {
    expect(resolveLevel(3000).isMax).toBe(true);
    expect(resolveLevel(3000).level).toBe(6);
  });

  it('negatif/NaN/eksik puan 0 sayılır (savunmacı)', () => {
    expect(resolveLevel(-50).level).toBe(1);
    expect(resolveLevel(Number.NaN).level).toBe(1);
    expect(resolveLevel(undefined as unknown as number).level).toBe(1);
  });

  it('LEVELS eşikleri kesin artan (resolveLevel bu değişmeze güvenir)', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].floor).toBeGreaterThan(LEVELS[i - 1].floor);
      expect(LEVELS[i].level).toBe(LEVELS[i - 1].level + 1);
    }
  });

  it('her seviyenin kendi aralığındaki puanlar o seviyeyi döndürür', () => {
    expect(resolveLevel(99).level).toBe(1);
    expect(resolveLevel(299).level).toBe(2);
    expect(resolveLevel(699).level).toBe(3);
    expect(resolveLevel(1499).level).toBe(4);
    expect(resolveLevel(2999).level).toBe(5);
  });
});
