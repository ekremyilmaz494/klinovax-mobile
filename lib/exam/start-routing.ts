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
  | { kind: 'result' };

/**
 * Backend start response status'üne göre hangi ekrana gidilmeli.
 * `null` → bilinmeyen status (switch'te case yok); çağıran no-op yapar.
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
    default:
      return null;
  }
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
