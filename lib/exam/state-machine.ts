/**
 * Exam Attempt + Training Assignment için **state machine** (mobil kopya).
 *
 * ⚠️ SOURCE OF TRUTH backend'de: `hospital-lms/apps/web/src/lib/exam-state-machine.ts`.
 * Bu dosya o web kaynağının **bit-bit** portudur ve onunla senkron tutulmalıdır —
 * transition mantığı değişirse iki tarafta da güncelle. Bu modül BU TURDA ekranlara
 * entegre EDİLMEDİ; shared-truth referansı + test kapsamı için duruyor.
 *
 * NOT: `AttemptStatus`/`ExamPhase` isimleri `types/exam.ts`'tekilerle çakışır —
 * bu modülden re-export YAPMA; tüketici açıkça `@/lib/exam/state-machine`'den almalı.
 *
 * Kapsam (TEK doğruluk kaynağı olduğu yer):
 *   - Status TRANSITION'ları (hangi event hangi state'e götürür)
 *   - Phase GUARD'ları (kullanıcı bu route'ta bulunabilir mi)
 *   - Submit sonrası ROUTING (hangi sayfaya yönlensin)
 */

// ── Status types ──────────────────────────────────────────────────────

export type AttemptStatus = 'pre_exam' | 'watching_videos' | 'post_exam' | 'completed' | 'expired';

export type AssignmentStatus = 'assigned' | 'in_progress' | 'passed' | 'failed' | 'locked';

export const ATTEMPT_TERMINAL_STATUSES: readonly AttemptStatus[] = [
  'completed',
  'expired',
] as const;
export const ASSIGNMENT_TERMINAL_STATUSES: readonly AssignmentStatus[] = [
  'passed',
  'failed',
  'locked',
] as const;

// ── Events (transition triggers) ──────────────────────────────────────

export type AttemptEvent =
  | {
      type: 'START';
      examOnly: boolean;
      isRetry: boolean;
      /** Eğitimde requirePreExamOnRetry=true ise retry'da yine pre-exam yap. */
      requirePreExamOnRetry: boolean;
    }
  | { type: 'PRE_EXAM_SUBMITTED' }
  | { type: 'VIDEOS_COMPLETED' }
  | { type: 'POST_EXAM_SUBMITTED' }
  /** Sınav süresi doldu — pre/post fazındaki attempt completed+failed olur. */
  | { type: 'TIMEOUT' }
  | { type: 'EXPIRE' };

export type AssignmentEvent =
  | { type: 'ATTEMPT_STARTED' }
  | { type: 'POST_EXAM_PASSED' }
  | { type: 'POST_EXAM_FAILED'; attemptsRemaining: number }
  | { type: 'TRAINING_LOCKED' }
  | { type: 'ATTEMPT_RESET' };

// ── Transition results ────────────────────────────────────────────────

export type TransitionResult<S> = { ok: true; next: S } | { ok: false; reason: string };

// ── Attempt state machine ─────────────────────────────────────────────

/**
 * `current === null` → henüz hiç attempt yok (sadece START kabul edilir).
 * `current === '...'` → mevcut attempt'in status'ü.
 */
export function attemptNextStatus(
  current: AttemptStatus | null,
  event: AttemptEvent,
): TransitionResult<AttemptStatus> {
  // EXPIRE her non-terminal state'ten kabul edilir.
  if (event.type === 'EXPIRE') {
    if (current === null) return { ok: false, reason: 'Var olmayan attempt expire edilemez' };
    if (ATTEMPT_TERMINAL_STATUSES.includes(current)) {
      return { ok: false, reason: `Terminal state'ten (${current}) expire'a geçilemez` };
    }
    return { ok: true, next: 'expired' };
  }

  if (event.type === 'START') {
    if (current !== null) {
      return { ok: false, reason: `Zaten aktif attempt var (${current}); START kabul edilmez` };
    }
    if (event.examOnly) return { ok: true, next: 'post_exam' };
    if (event.isRetry && !event.requirePreExamOnRetry) return { ok: true, next: 'watching_videos' };
    return { ok: true, next: 'pre_exam' };
  }

  if (event.type === 'PRE_EXAM_SUBMITTED') {
    if (current !== 'pre_exam') {
      return { ok: false, reason: `pre_exam değil (${current}), pre-exam submit kabul edilmez` };
    }
    return { ok: true, next: 'watching_videos' };
  }

  if (event.type === 'VIDEOS_COMPLETED') {
    if (current !== 'watching_videos') {
      return {
        ok: false,
        reason: `watching_videos değil (${current}), video completion kabul edilmez`,
      };
    }
    return { ok: true, next: 'post_exam' };
  }

  if (event.type === 'POST_EXAM_SUBMITTED') {
    if (current !== 'post_exam') {
      return { ok: false, reason: `post_exam değil (${current}), post-exam submit kabul edilmez` };
    }
    return { ok: true, next: 'completed' };
  }

  if (event.type === 'TIMEOUT') {
    // Sınav süresi doldu. EXPIRE'dan farkı: EXPIRE = terkedilmiş/stale attempt
    // (cron 24h+, admin training delete) → `expired`. TIMEOUT = kullanıcı sınava
    // girdi ama süre bitti → `completed` (deneme harcandı, isPassed=false route'ta).
    if (current !== 'pre_exam' && current !== 'post_exam') {
      return { ok: false, reason: `Sınav fazında değil (${current}), timeout kabul edilmez` };
    }
    return { ok: true, next: 'completed' };
  }

  // Exhaustive check — yeni event tipi eklenirse compile error verir
  const _exhaustive: never = event;
  return { ok: false, reason: `Bilinmeyen event: ${JSON.stringify(_exhaustive)}` };
}

// ── Assignment state machine ──────────────────────────────────────────

export function assignmentNextStatus(
  current: AssignmentStatus,
  event: AssignmentEvent,
): TransitionResult<AssignmentStatus> {
  if (event.type === 'TRAINING_LOCKED') {
    if (ASSIGNMENT_TERMINAL_STATUSES.includes(current)) {
      return { ok: false, reason: `Terminal state'ten (${current}) lock'a geçilemez` };
    }
    return { ok: true, next: 'locked' };
  }

  if (event.type === 'ATTEMPT_STARTED') {
    if (current === 'passed') {
      return { ok: false, reason: 'Passed assignment için yeni attempt başlatılamaz' };
    }
    if (current === 'locked') {
      return { ok: false, reason: 'Locked assignment için yeni attempt başlatılamaz' };
    }
    // assigned → in_progress; in_progress → in_progress (resume); failed → in_progress (admin yeni hak)
    return { ok: true, next: 'in_progress' };
  }

  if (event.type === 'POST_EXAM_PASSED') {
    if (current !== 'in_progress') {
      return { ok: false, reason: `in_progress değil (${current}), post-exam pass kabul edilmez` };
    }
    return { ok: true, next: 'passed' };
  }

  if (event.type === 'POST_EXAM_FAILED') {
    if (current !== 'in_progress') {
      return { ok: false, reason: `in_progress değil (${current}), post-exam fail kabul edilmez` };
    }
    return event.attemptsRemaining > 0
      ? { ok: true, next: 'in_progress' }
      : { ok: true, next: 'failed' };
  }

  if (event.type === 'ATTEMPT_RESET') {
    if (current === 'passed' || current === 'locked') {
      return { ok: false, reason: `Terminal state'ten (${current}) reset edilemez` };
    }
    return { ok: true, next: 'assigned' };
  }

  const _exhaustive: never = event;
  return { ok: false, reason: `Bilinmeyen event: ${JSON.stringify(_exhaustive)}` };
}

// ── Phase guards (route'larda kullanılır) ─────────────────────────────

/**
 * Bir attempt'in beklenen phase'lerde olup olmadığını kontrol eder.
 */
export function isAttemptInPhase(
  status: AttemptStatus,
  allowed: readonly AttemptStatus[],
): boolean {
  return allowed.includes(status);
}

/**
 * Yanlış phase'de olan kullanıcıyı nereye redirect etmeli? (Frontend phase guard)
 * `null` döndürürse "burada kalabilir" demektir.
 */
export type ExamRoute =
  | 'pre-exam'
  | 'videos'
  | 'post-exam'
  | 'transition'
  | 'my-trainings'
  | 'my-training-detail';

export function attemptPhaseRedirect(
  status: AttemptStatus,
  currentRoute: ExamRoute,
): ExamRoute | null {
  // Terminal status'lerde (completed/expired) kullanıcıyı liste sayfasına atmak
  // bağlam kaybettiriyor — detaya yönlendir; orada doğru CTA verilir.
  if (status === 'completed' || status === 'expired') {
    return currentRoute === 'my-training-detail' ? null : 'my-training-detail';
  }
  // Aktif phase'in route'u zaten doğru mu?
  const expectedRoute: ExamRoute = (
    {
      pre_exam: 'pre-exam',
      watching_videos: 'videos',
      post_exam: 'post-exam',
    } as const
  )[status];
  return currentRoute === expectedRoute ? null : expectedRoute;
}

/**
 * Attempt status → exam phase ('pre' | 'post' | null).
 * `null` döner: status sınav fazında değil (watching_videos / completed / expired).
 */
export type ExamPhase = 'pre' | 'post';

export function attemptStatusToExamPhase(status: AttemptStatus): ExamPhase | null {
  if (status === 'pre_exam') return 'pre';
  if (status === 'post_exam') return 'post';
  return null;
}

// ── Re-routing helper (transition page için) ──────────────────────────

/**
 * Submit sonrası nereye yönlendirilmeli? Bu fonksiyon, status değil EVENT'e bakar.
 */
export function postEventRoute(event: AttemptEvent): ExamRoute {
  switch (event.type) {
    case 'START':
      if (event.examOnly) return 'post-exam';
      if (event.isRetry && !event.requirePreExamOnRetry) return 'videos';
      return 'pre-exam';
    case 'PRE_EXAM_SUBMITTED':
      return 'transition'; // → videos
    case 'VIDEOS_COMPLETED':
      return 'transition'; // → post-exam
    case 'POST_EXAM_SUBMITTED':
      return 'transition'; // → my-trainings (sonuç + feedback)
    case 'TIMEOUT':
      return 'my-trainings'; // süre doldu — eğitim listesine dön
    case 'EXPIRE':
      return 'my-trainings';
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return 'my-trainings';
    }
  }
}
