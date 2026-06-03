import { isAllowedLegalUrl, legalUrl, LEGAL_TITLES } from '../legal-url';

jest.mock('@/lib/config', () => ({ API_BASE_URL: 'https://klinovax.com' }));

describe('legalUrl', () => {
  it('bilinen slug → /<slug>', () => {
    expect(legalUrl('kvkk')).toBe('https://klinovax.com/kvkk');
    expect(legalUrl('terms')).toBe('https://klinovax.com/terms');
    expect(legalUrl('privacy')).toBe('https://klinovax.com/privacy');
  });

  it('bilinmeyen slug → kvkk fallback', () => {
    expect(legalUrl('hack')).toBe('https://klinovax.com/kvkk');
    expect(legalUrl('')).toBe('https://klinovax.com/kvkk');
  });

  it('üç yasal başlık tanımlı', () => {
    expect(Object.keys(LEGAL_TITLES).sort()).toEqual(['kvkk', 'privacy', 'terms']);
  });
});

describe('isAllowedLegalUrl', () => {
  const base = 'https://klinovax.com/kvkk';

  it('tam eşleşme → izin', () => {
    expect(isAllowedLegalUrl(base, base)).toBe(true);
  });

  it('?bare=1 query farkı → izin (eski tam-string lock bunu blokluyordu)', () => {
    expect(isAllowedLegalUrl(base, `${base}?bare=1`)).toBe(true);
  });

  it('#anchor hash farkı → izin', () => {
    expect(isAllowedLegalUrl(base, `${base}#bolum-2`)).toBe(true);
  });

  it('trailing slash → izin (normalize)', () => {
    expect(isAllowedLegalUrl(base, `${base}/`)).toBe(true);
    expect(isAllowedLegalUrl(base, `${base}/?bare=1`)).toBe(true);
  });

  it('about:/data:/blob: → izin (WebView iç şemaları)', () => {
    expect(isAllowedLegalUrl(base, 'about:blank')).toBe(true);
    expect(isAllowedLegalUrl(base, 'data:text/html,x')).toBe(true);
  });

  it('boş/null url → izin (engelleme nedeni yok)', () => {
    expect(isAllowedLegalUrl(base, null)).toBe(true);
    expect(isAllowedLegalUrl(base, undefined)).toBe(true);
  });

  it('BAŞKA yasal slug → engelle (lock korunur)', () => {
    expect(isAllowedLegalUrl(base, 'https://klinovax.com/terms')).toBe(false);
  });

  it('login / başka iç sayfa → engelle', () => {
    expect(isAllowedLegalUrl(base, 'https://klinovax.com/auth/login')).toBe(false);
  });

  it('dış site → engelle', () => {
    expect(isAllowedLegalUrl(base, 'https://evil.example.com/kvkk')).toBe(false);
  });
});
