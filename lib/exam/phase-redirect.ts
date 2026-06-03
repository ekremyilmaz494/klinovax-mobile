import { ApiError } from '@/lib/api/client';

/**
 * Sınav fazı uyuşmazlığı saf mantığı.
 *
 * Backend, kullanıcı yanlış fazda bir sınav ekranı açmaya çalışınca (örn. attempt
 * `watching_videos`'tayken `?phase=post` sorularını istemek) **403** + yönlendirme
 * ipucu döner. Body şekli (error alanı JSON STRING):
 *   { "error": "{\"message\":\"...\",\"currentPhase\":\"watching_videos\",\"redirect\":\"videos\"}" }
 *
 * Mobil bunu çıkmaz hata ekranı yerine DOĞRU ekrana yönlendirmek için kullanır —
 * aksi halde kullanıcı "girilemiyor/atıldım" hisseder (Fatih Yalvaç saha bulgusu).
 */

export type PhaseRedirect = { redirect: string; message: string };

export function extractPhaseRedirect(error: unknown): PhaseRedirect | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const body = error.body as { error?: unknown } | null;
  const raw = body?.error;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as { redirect?: unknown; message?: unknown };
    if (typeof parsed?.redirect === 'string') {
      return {
        redirect: parsed.redirect,
        message: typeof parsed.message === 'string' ? parsed.message : '',
      };
    }
  } catch {
    // raw geçerli JSON değil (sıradan 403) — yönlendirme yok.
  }
  return null;
}

/** Backend redirect değeri → kullanıcı dostu başlık/gövde/buton. */
export function phaseRedirectCopy(redirect: string): {
  title: string;
  body: string;
  cta: string;
} {
  switch (redirect) {
    case 'videos':
      return {
        title: 'Önce videoları tamamla',
        body: 'Son sınava geçebilmek için eğitim videolarını izlemen gerekiyor.',
        cta: 'Videolara dön',
      };
    case 'pre-exam':
    case 'pre':
      return {
        title: 'Önce ön sınavı tamamla',
        body: 'Bu aşamaya geçmeden önce ön sınavı bitirmen gerekiyor.',
        cta: 'Ön sınava dön',
      };
    default:
      return {
        title: 'Bu aşamaya şu an girilemiyor',
        body: 'Sınav durumun bu aşama için uygun değil. Eğitim sayfasından kaldığın yerden devam edebilirsin.',
        cta: 'Eğitim sayfasına dön',
      };
  }
}

/** Backend redirect değeri → mobil route suffix'i (assignmentId çağıran tarafından eklenir). */
export function phaseRedirectRoute(
  redirect: string,
): { kind: 'videos' } | { kind: 'questions'; phase: 'pre' } | { kind: 'detail' } {
  if (redirect === 'videos') return { kind: 'videos' };
  if (redirect === 'pre-exam' || redirect === 'pre') return { kind: 'questions', phase: 'pre' };
  return { kind: 'detail' };
}
