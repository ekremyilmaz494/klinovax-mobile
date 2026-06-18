/**
 * İşlem geçmişi aksiyon anahtarı → Türkçe etiket. Web (`staff/profile/activity`
 * page.tsx `ACTION_TR`) ile aynı; bilinmeyen anahtar ham string döner (ileri uyum —
 * backend yeni aksiyon tipi eklerse ekran kırılmaz).
 */
const ACTION_TR: Record<string, string> = {
  'user.login': 'Oturum açıldı',
  'user.logout': 'Oturum kapatıldı',
  'user.profile_updated': 'Profil güncellendi',
  'user.password_changed': 'Şifre değiştirildi',
  'user.avatar_updated': 'Avatar güncellendi',
  'kvkk_request.created': 'KVKK talebi oluşturuldu',
  'certificate.downloaded': 'Sertifika indirildi',
  'exam.started': 'Sınav başlatıldı',
  'exam.submitted': 'Sınav tamamlandı',
};

export function auditActionLabel(action: string): string {
  return ACTION_TR[action] ?? action;
}
