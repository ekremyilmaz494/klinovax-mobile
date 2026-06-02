import { ApiError } from '@/lib/api/client';
import type { AttemptStatus } from '@/types/exam';

/**
 * Sınav başlatma routing saf mantığı — `app/exam/[assignmentId]/start.tsx`'in
 * status→route switch'i ve 423 pendingFeedback çıkarımı buradan extract edildi.
 */

/** start.tsx'teki `router.replace` hedeflerinin path suffix'leri (assignmentId hariç). */
export type StartRouteTarget =
  | { kind: 'questions'; phase: 'pre' | 'post' }
  | { kind: 'videos' }
  | { kind: 'result' }
  /** Eğitim detayına dön — expired gibi sınav ekranı anlamsız durumlarda. */
  | { kind: 'detail' };

/**
 * Backend start response status'üne göre hangi ekrana gidilmeli.
 * `null` → bilinmeyen status; çağıran kullanıcıyı bilgilendirip geri yönlendirir.
 */
export function resolveStartRoute(status: AttemptStatus): StartRouteTarget | null {
  switch (status) {
    case 'pre_exam':
      return { kind: 'questions', phase: 'pre' };
    case 'post_exam':
      return { kind: 'questions', phase: 'post' };
    case 'watching_videos':
      return { kind: 'videos' };
    case 'completed':
      return { kind: 'result' };
    case 'expired':
      // Web paritesi: expired attempt için sınav/sonuç ekranı yok, detaya dönülür
      // (orada EXPIRED_RETRYABLE banner'ı + doğru CTA gösterilir).
      return { kind: 'detail' };
    default:
      return null;
  }
}

/**
 * Ön sınav submit yanıtındaki `nextStep`'e göre hedef faz. Backend videosuz
 * eğitimde video fazını otomatik atlayıp `nextStep: 'post-exam'` döner
 * (submit/route.ts: `advance.advanced ? 'post-exam' : 'videos'`) — bu durumda
 * videolara yönlendirmek kullanıcıyı boş ekranda çıkmaza sokar.
 */
export function resolvePreSubmitTarget(nextStep: string | undefined): 'videos' | 'post-exam' {
  return nextStep === 'post-exam' ? 'post-exam' : 'videos';
}

/**
 * 423 (locked) hatasının body'sinden pendingFeedback yönlendirme bilgisini çıkar.
 * Backend: kullanıcı önceki eğitim için zorunlu geri bildirimi tamamlamadan yeni
 * eğitim başlatamaz. attemptId yoksa (eski backend / eksik payload) `null` döner —
 * çağıran fallback bilgilendirme gösterir.
 */
export function extractPendingFeedbackRoute(
  error: unknown,
): { attemptId: string; trainingTitle?: string } | null {
  if (!(error instanceof ApiError) || error.status !== 423) return null;
  const body = error.body as {
    pendingFeedback?: { attemptId?: string; trainingTitle?: string };
  } | null;
  const pending = body?.pendingFeedback;
  if (!pending?.attemptId) return null;
  return { attemptId: pending.attemptId, trainingTitle: pending.trainingTitle };
}
