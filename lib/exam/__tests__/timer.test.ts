import { computeRemainingSeconds, resolveTimerEndMs, shouldAutoSubmitTimer } from '../timer';

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

describe('resolveTimerEndMs', () => {
  const now = 1_000_000;

  it('sunucu expiresAt varsa onu kullanır (DB recovery path)', () => {
    // 30dk'lık sınavın 25dk'sı geçmiş — sunucu 5dk kaldı diyor
    const serverEnd = now + 5 * 60_000;
    expect(
      resolveTimerEndMs({
        expiresAt: serverEnd,
        remainingSeconds: 300,
        fallbackTotalTimeSeconds: 1800,
        nowMs: now,
      }),
    ).toBe(serverEnd);
  });

  it('expiresAt yoksa remainingSeconds kullanılır (Redis canlı sayaç path — expiresAt dönmez)', () => {
    // KRİTİK resume senaryosu: backend { remainingSeconds: 300, expired: false } döner.
    // Fallback'e (tam süre) düşmek sayacı sıfırlar — kalan süre korunmalı.
    expect(
      resolveTimerEndMs({
        expiresAt: undefined,
        remainingSeconds: 300,
        fallbackTotalTimeSeconds: 1800,
        nowMs: now,
      }),
    ).toBe(now + 300 * 1000);
  });

  it('sunucu expiresAt geçmişte kalmışsa bile onu döner (kalan 0 → auto-submit)', () => {
    const pastEnd = now - 60_000;
    expect(
      resolveTimerEndMs({
        expiresAt: pastEnd,
        remainingSeconds: 0,
        fallbackTotalTimeSeconds: 1800,
        nowMs: now,
      }),
    ).toBe(pastEnd);
  });

  it('remainingSeconds 0 ise fallback yerine 0 kalan kurulur (auto-submit tetiklenir)', () => {
    expect(
      resolveTimerEndMs({
        expiresAt: undefined,
        remainingSeconds: 0,
        fallbackTotalTimeSeconds: 1800,
        nowMs: now,
      }),
    ).toBe(now);
  });

  it('iki sunucu değeri de yoksa fallback: şimdi + toplam süre', () => {
    expect(
      resolveTimerEndMs({
        expiresAt: null,
        remainingSeconds: null,
        fallbackTotalTimeSeconds: 1800,
        nowMs: now,
      }),
    ).toBe(now + 1800 * 1000);
  });

  it('iki sunucu değeri de undefined ise (eski backend) fallback kurulur', () => {
    expect(
      resolveTimerEndMs({
        expiresAt: undefined,
        remainingSeconds: undefined,
        fallbackTotalTimeSeconds: 600,
        nowMs: now,
      }),
    ).toBe(now + 600 * 1000);
  });
});
