import { auditActionLabel } from '../labels';

describe('auditActionLabel', () => {
  it('bilinen aksiyonları Türkçe etikete çevirir (web ACTION_TR paritesi)', () => {
    expect(auditActionLabel('user.login')).toBe('Oturum açıldı');
    expect(auditActionLabel('user.password_changed')).toBe('Şifre değiştirildi');
    expect(auditActionLabel('kvkk_request.created')).toBe('KVKK talebi oluşturuldu');
    expect(auditActionLabel('exam.submitted')).toBe('Sınav tamamlandı');
  });

  it('bilinmeyen aksiyon → ham string (ileri uyum, ekran kırılmaz)', () => {
    expect(auditActionLabel('subscription.renewed')).toBe('subscription.renewed');
    expect(auditActionLabel('')).toBe('');
  });
});
