import { clampSeekTarget } from '../video-seek';

describe('clampSeekTarget — ileri sarma engeli (anti-cheat)', () => {
  it('geri sarma serbest: hedef mevcut konumdan küçükse aynen döner', () => {
    expect(clampSeekTarget(120, 110)).toBe(110);
  });

  it('"10 saniye geri" butonu: 120sn → 110sn', () => {
    expect(clampSeekTarget(120, 120 - 10)).toBe(110);
  });

  it('İLERİ sarma YASAK: hedef mevcut konumu aşarsa mevcut konuma kilitlenir', () => {
    expect(clampSeekTarget(120, 300)).toBe(120);
  });

  it('hedef mevcut konuma eşitse değişmez', () => {
    expect(clampSeekTarget(60, 60)).toBe(60);
  });

  it('videonun başından geriye gidilemez (negatif hedef → 0)', () => {
    expect(clampSeekTarget(5, -10)).toBe(0);
  });

  it('video başındayken (0sn) hiçbir hedef ileri götüremez', () => {
    expect(clampSeekTarget(0, 50)).toBe(0);
  });

  it('NaN current/target güvenli 0 döner (player.currentTime metadata öncesi)', () => {
    expect(clampSeekTarget(NaN, 10)).toBe(0);
    expect(clampSeekTarget(120, NaN)).toBe(0);
    expect(clampSeekTarget(NaN, NaN)).toBe(0);
  });
});
