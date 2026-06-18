import type { AttemptStatus, ExamStateRedirect } from '@/types/exam';
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
  | { kind: 'training-detail' }
  /** Eğitim listesine dön (atama bulunamadı / dönem dışı) — /exam/state `redirect:'my-trainings'`. */
  | { kind: 'trainings-list' };

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
 * `GET /api/exam/[id]/state` `redirect` alanı → mobil route hedefi.
 *
 * Backend tek otoriteli faz çözücüsü (`resolveExamFlowState`) kullanıcının olması
 * gereken route'u döndürür; `from` ile uyuşuyorsa `redirect: null` (aksiyon yok).
 * Mobil bunu foreground'a dönüşte çağırıp bayat ekrandan doğru faza sıçramak için
 * kullanır. `resolveAttemptStatusRoute` ile aynı hedef uzayına eşlenir — stage↔redirect
 * tutarlılığı `state-machine-bridge` testinde kilitli (`completed`/`expired` → detail,
 * web'de ayrı bir "result" route'u yok).
 */
export function examStateRedirectTarget(
  redirect: ExamStateRedirect | null | undefined,
): ExamRouteTarget | null {
  switch (redirect) {
    case 'pre-exam':
      return { kind: 'questions', phase: 'pre' };
    case 'post-exam':
      return { kind: 'questions', phase: 'post' };
    case 'videos':
      return { kind: 'videos' };
    case 'my-training-detail':
      return { kind: 'training-detail' };
    case 'my-trainings':
      return { kind: 'trainings-list' };
    default:
      // null (zaten doğru faz) veya bilinmeyen değer → aksiyon yok.
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
