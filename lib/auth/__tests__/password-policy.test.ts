import { checkNewPassword, passwordStrength } from '../password-policy';

describe('checkNewPassword (backend kuralı paritesi)', () => {
  it('geçerli: min 8 + büyük harf + rakam', () => {
    expect(checkNewPassword('Parola12').valid).toBe(true);
  });

  it('8 karakterden kısa → geçersiz', () => {
    const r = checkNewPassword('Par12');
    expect(r.valid).toBe(false);
    expect(r.minLength).toBe(false);
  });

  it('büyük harf yok → geçersiz', () => {
    const r = checkNewPassword('parola12');
    expect(r.valid).toBe(false);
    expect(r.hasUpper).toBe(false);
  });

  it('rakam yok → geçersiz', () => {
    const r = checkNewPassword('ParolaABC');
    expect(r.valid).toBe(false);
    expect(r.hasDigit).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('boş/kısa-basit → zayif', () => {
    expect(passwordStrength('')).toBe('zayif');
    expect(passwordStrength('parola')).toBe('zayif');
  });

  it('uzun + karışık → guclu', () => {
    expect(passwordStrength('Parola12!xyz')).toBe('guclu');
  });
});
