import { resolveColorScheme } from '../use-theme-preference';

describe('resolveColorScheme', () => {
  it("tercih 'light' ise cihaz karanlık olsa bile light döner", () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
  });

  it("tercih 'dark' ise cihaz aydınlık olsa bile dark döner", () => {
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });

  it("tercih 'system' + cihaz dark → dark", () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
  });

  it("tercih 'system' + cihaz light → light", () => {
    expect(resolveColorScheme('system', 'light')).toBe('light');
  });

  it("tercih 'system' + cihaz null (heuristik henüz çalışmadı) → güvenli varsayılan light", () => {
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('system', undefined)).toBe('light');
  });

  it('sabit tercihler cihaz null olsa da kararlı', () => {
    expect(resolveColorScheme('light', null)).toBe('light');
    expect(resolveColorScheme('dark', undefined)).toBe('dark');
  });
});
