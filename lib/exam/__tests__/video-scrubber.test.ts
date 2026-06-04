import { pointToSeconds, progressPercent } from '../video-scrubber';

describe('pointToSeconds', () => {
  it('orta nokta süreyi yarılar', () => {
    expect(pointToSeconds(100, 200, 60)).toBe(30);
  });

  it('sol kenar 0', () => {
    expect(pointToSeconds(0, 200, 60)).toBe(0);
  });

  it('sağ kenar tam süre', () => {
    expect(pointToSeconds(200, 200, 60)).toBe(60);
  });

  it('genişlik dışına taşan x clamp edilir (sağ)', () => {
    expect(pointToSeconds(300, 200, 60)).toBe(60);
  });

  it('negatif x clamp edilir (sol)', () => {
    expect(pointToSeconds(-50, 200, 60)).toBe(0);
  });

  it('sıfır genişlik/süre güvenli 0 döner', () => {
    expect(pointToSeconds(100, 0, 60)).toBe(0);
    expect(pointToSeconds(100, 200, 0)).toBe(0);
  });
});

describe('progressPercent', () => {
  it('yarı izlenen %50', () => {
    expect(progressPercent(30, 60)).toBe(50);
  });

  it('süreyi aşan değer %100 clamp', () => {
    expect(progressPercent(90, 60)).toBe(100);
  });

  it('sıfır süre güvenli 0', () => {
    expect(progressPercent(10, 0)).toBe(0);
  });
});
