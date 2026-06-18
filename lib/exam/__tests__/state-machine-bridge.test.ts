import { examStateRedirectTarget, resolveAttemptStatusRoute } from '../route-guard';
import { attemptPhaseRedirect, type AttemptStatus } from '../state-machine';

/**
 * route-guard ↔ state-machine köprü testi.
 *
 * Backend GET /exam/[id]/state web-kanonik `attemptPhaseRedirect` ile `redirect` üretir;
 * mobil foreground senkronu (videos.tsx) bunu `examStateRedirectTarget` ile route'a çevirir.
 * Bu test, iki tarafın AYNI hedefi ürettiğini kilitler — state-machine.ts web ile
 * senkronlanınca (CLAUDE.md: bit-bit aynı) burada bir drift kırılma olarak yüzeye çıkar.
 */

const ALL_STATUSES: AttemptStatus[] = [
  'pre_exam',
  'watching_videos',
  'post_exam',
  'completed',
  'expired',
];

describe('examStateRedirectTarget', () => {
  it('redirect değerlerini route hedefine eşler', () => {
    expect(examStateRedirectTarget('pre-exam')).toEqual({ kind: 'questions', phase: 'pre' });
    expect(examStateRedirectTarget('post-exam')).toEqual({ kind: 'questions', phase: 'post' });
    expect(examStateRedirectTarget('videos')).toEqual({ kind: 'videos' });
    expect(examStateRedirectTarget('my-training-detail')).toEqual({ kind: 'training-detail' });
    expect(examStateRedirectTarget('my-trainings')).toEqual({ kind: 'trainings-list' });
  });

  it('null/undefined → null (zaten doğru faz, yönlendirme yok)', () => {
    expect(examStateRedirectTarget(null)).toBeNull();
    expect(examStateRedirectTarget(undefined)).toBeNull();
  });
});

describe('route-guard ↔ state-machine köprüsü', () => {
  it('her AttemptStatus için resolveAttemptStatusRoute non-null hedef döndürür', () => {
    for (const s of ALL_STATUSES) {
      expect(resolveAttemptStatusRoute(s)).not.toBeNull();
    }
  });

  it('aktif fazlar: state-machine redirect ile mobil eşleme tutarlı', () => {
    // Kullanıcı YANLIŞ route'ta (my-trainings) → attemptPhaseRedirect aktif fazın route'unu üretir;
    // examStateRedirectTarget(o redirect) ile resolveAttemptStatusRoute(status) AYNI hedefi vermeli.
    expect(attemptPhaseRedirect('pre_exam', 'my-trainings')).toBe('pre-exam');
    expect(examStateRedirectTarget('pre-exam')).toEqual(resolveAttemptStatusRoute('pre_exam'));

    expect(attemptPhaseRedirect('watching_videos', 'my-trainings')).toBe('videos');
    expect(examStateRedirectTarget('videos')).toEqual(resolveAttemptStatusRoute('watching_videos'));

    expect(attemptPhaseRedirect('post_exam', 'my-trainings')).toBe('post-exam');
    expect(examStateRedirectTarget('post-exam')).toEqual(resolveAttemptStatusRoute('post_exam'));
  });

  it('expired: state-machine my-training-detail döner, iki taraf da training-detail', () => {
    expect(attemptPhaseRedirect('expired', 'videos')).toBe('my-training-detail');
    expect(examStateRedirectTarget('my-training-detail')).toEqual({ kind: 'training-detail' });
    expect(resolveAttemptStatusRoute('expired')).toEqual({ kind: 'training-detail' });
  });

  it('completed: BİLİNÇLİ sapma — web detail, mobil ayrı result ekranı', () => {
    // attemptPhaseRedirect completed'ı detaya atar (web'de result route yok). Mobilde
    // ayrı bir result ekranı var → resolveAttemptStatusRoute result döner. Sapma kasıtlı,
    // foreground senkronu /state redirect'ini (detail) kullanır, bu yüzden çelişki yok.
    expect(attemptPhaseRedirect('completed', 'videos')).toBe('my-training-detail');
    expect(examStateRedirectTarget('my-training-detail')).toEqual({ kind: 'training-detail' });
    expect(resolveAttemptStatusRoute('completed')).toEqual({ kind: 'result' });
  });

  it('doğru route → attemptPhaseRedirect null → senkron yönlendirme yapmaz', () => {
    expect(attemptPhaseRedirect('watching_videos', 'videos')).toBeNull();
    expect(examStateRedirectTarget(null)).toBeNull();
  });
});
