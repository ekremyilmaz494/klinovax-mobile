import { parseRetryAfterSeconds } from '../client';

// Sabit referans an — saniye sınırında (1e12 ms = 1e9 sn tam) ki HTTP-date
// farkı ms artığı bırakmasın.
const NOW = 1_000_000_000_000;

describe('parseRetryAfterSeconds', () => {
  it('sayısal saniye değerini parse eder', () => {
    expect(parseRetryAfterSeconds('30', NOW)).toBe(30);
    expect(parseRetryAfterSeconds('0', NOW)).toBe(0);
    expect(parseRetryAfterSeconds('  45 ', NOW)).toBe(45);
  });

  it('boş / null / undefined → null', () => {
    expect(parseRetryAfterSeconds(null, NOW)).toBeNull();
    expect(parseRetryAfterSeconds(undefined, NOW)).toBeNull();
    expect(parseRetryAfterSeconds('', NOW)).toBeNull();
  });

  it('HTTP-date → kalan saniye (yukarı yuvarlanır)', () => {
    const future = new Date(NOW + 45_000).toUTCString();
    expect(parseRetryAfterSeconds(future, NOW)).toBe(45);
  });

  it('geçmiş HTTP-date → 0 (negatife düşmez)', () => {
    const past = new Date(NOW - 10_000).toUTCString();
    expect(parseRetryAfterSeconds(past, NOW)).toBe(0);
  });

  it('geçersiz string → null', () => {
    expect(parseRetryAfterSeconds('abc', NOW)).toBeNull();
    expect(parseRetryAfterSeconds('12x', NOW)).toBeNull();
  });
});
