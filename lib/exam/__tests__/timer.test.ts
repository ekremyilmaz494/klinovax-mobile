import { computeRemainingSeconds, shouldAutoSubmitTimer } from '../timer';

describe('shouldAutoSubmitTimer', () => {
  it('remaining 0 + henüz submit edilmemiş → true', () => {
    expect(shouldAutoSubmitTimer({ remaining: 0, alreadySubmitted: false })).toBe(true);
  });

  it('ikinci çağrı (alreadySubmitted) → false (çift submit engeli)', () => {
    expect(shouldAutoSubmitTimer({ remaining: 0, alreadySubmitted: true })).toBe(false);
  });

  it('süre kalmışsa → false', () => {
    expect(shouldAutoSubmitTimer({ remaining: 5, alreadySubmitted: false })).toBe(false);
  });

  it('negatif remaining (clock skew) + submit edilmemiş → true', () => {
    expect(shouldAutoSubmitTimer({ remaining: -3, alreadySubmitted: false })).toBe(true);
  });
});

describe('computeRemainingSeconds', () => {
  it('30sn kalmış → 30', () => {
    const now = 1_000_000;
    expect(computeRemainingSeconds(now + 30_000, now)).toBe(30);
  });

  it('bitiş geçmişse negatife düşmez (clamp 0)', () => {
    const now = 1_000_000;
    expect(computeRemainingSeconds(now - 5_000, now)).toBe(0);
  });

  it('kısmi saniye yukarı yuvarlanır (ceil)', () => {
    const now = 1_000_000;
    // 500ms kalmış → 1sn göster (son saniye 0'da bitsin)
    expect(computeRemainingSeconds(now + 500, now)).toBe(1);
  });
});
