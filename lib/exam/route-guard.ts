import type { AttemptStatus } from '@/types/exam';
import type { TrainingDetail } from '@/types/staff';

/**
 * Frontend route guard saf mantığı (Ekrem'in tasarımı).
 *
 * Backend faz uyumsuzluğunu 403 ile zaten zorlar; bu guard'ın amacı kullanıcıyı
 * 403 hata ekranına düşürmeden DOĞRU faza yönlendirmek (defense-in-depth + UX):
 *   - videos.tsx: GET /videos yanıtındaki attemptStatus ile mismatch tespiti
 *   - trainings/[id].tsx: "Devam et" CTA'sını doğru ekrana götürme (start ekranı
 *     atlanır — attempt zaten var, POST /start gereksiz)
 */

export type ExamRouteTarget =
  | { kind: 'start' }
  /**
   * Retry: POST /start ekranını AÇMADAN yerinde çalıştır (kuralları atla) ve dönen
   * status'e göre yönlendir. `start`'tan farkı kurallar ekranını göstermemesidir —
   * retry'da ön sınav atlanıp doğrudan videoya gidildiği için sınav kuralları yanıltıcı.
   */
  | { kind: 'start-direct' }
  | { kind: 'questions'; phase: 'pre' | 'post' }
  | { kind: 'videos' }
  | { kind: 'result' }
  | { kind: 'training-detail' };

export type CurrentExamRoute = { kind: 'questions'; phase: 'pre' | 'post' } | { kind: 'videos' };

/** Backend attempt status'üne göre kullanıcının olması gereken ekran. */
export function resolveAttemptStatusRoute(
  status: AttemptStatus | 'review' | null | undefined,
): ExamRouteTarget | null {
  switch (status) {
    case 'pre_exam':
      return { kind: 'questions', phase: 'pre' };
    case 'watching_videos':
      return { kind: 'videos' };
    case 'post_exam':
      return { kind: 'questions', phase: 'post' };
    case 'completed':
    case 'review':
      return { kind: 'result' };
    case 'expired':
      return { kind: 'training-detail' };
    default:
      return null;
  }
}

/**
 * Eğitim detayındaki "Başla / Devam et" CTA'sının hedefi.
 *
 * POST /start gerektiren iki durum AYRIŞIR:
 *   - `start`        : fresh ilk deneme (assigned) — sınav kuralları ekranı anlamlı,
 *                      kullanıcı ön sınava girecek; kuralları gösterip onay al.
 *   - `start-direct` : retry (needsRetry / expired-retryable) — ön sınav atlanıp
 *                      doğrudan videoya gidilir (web paritesi); kurallar ekranı yerine
 *                      POST /start yerinde çalışır, dönen status'e göre yönlendirilir.
 * Doğrudan faz dönen durumlar attempt'in zaten var olduğu resume senaryolarıdır —
 * start ekranını atlamak bir dokunuş tasarruf ettirir.
 */
export function resolveTrainingDetailRoute(detail: TrainingDetail): ExamRouteTarget {
  if (detail.status === 'locked' || detail.isNotStarted) return { kind: 'training-detail' };
  if (detail.isExpiredRetryable || detail.needsRetry) return { kind: 'start-direct' };
  if (detail.isExpired) return { kind: 'training-detail' };
  // Fresh atama: attempt henüz YOK — doğrudan faza gitmek 403/404 verir.
  // POST /start şart (attempt yaratır + zorunlu feedback 423 gate'inden geçer).
  if (detail.status === 'assigned') return { kind: 'start' };
  // EXHAUSTED (hak bitti, retry yok): CTA kilitli — ek hak talebi formu detayda.
  if (detail.status === 'failed') return { kind: 'training-detail' };
  if (detail.status === 'passed' || detail.postExamCompleted) return { kind: 'result' };

  if (detail.examOnly) return { kind: 'questions', phase: 'post' };
  if (!detail.preExamCompleted) return { kind: 'questions', phase: 'pre' };
  if (!detail.videosCompleted) return { kind: 'videos' };
  return { kind: 'questions', phase: 'post' };
}

/** Mevcut ekran beklenen hedefle uyuşmuyorsa true — çağıran redirect yapar. */
export function shouldRedirectExamRoute(
  current: CurrentExamRoute,
  expected: ExamRouteTarget | null,
): expected is ExamRouteTarget {
  if (!expected) return false;
  if (expected.kind === 'questions') {
    return current.kind !== 'questions' || current.phase !== expected.phase;
  }
  return current.kind !== expected.kind;
}
