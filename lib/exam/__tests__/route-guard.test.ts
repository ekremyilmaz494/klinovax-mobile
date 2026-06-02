import type { TrainingDetail } from '@/types/staff';

import {
  resolveAttemptStatusRoute,
  resolveTrainingDetailRoute,
  shouldRedirectExamRoute,
} from '../route-guard';

describe('resolveAttemptStatusRoute', () => {
  it('pre_exam → questions/pre', () => {
    expect(resolveAttemptStatusRoute('pre_exam')).toEqual({ kind: 'questions', phase: 'pre' });
  });

  it('watching_videos → videos', () => {
    expect(resolveAttemptStatusRoute('watching_videos')).toEqual({ kind: 'videos' });
  });

  it('post_exam → questions/post', () => {
    expect(resolveAttemptStatusRoute('post_exam')).toEqual({ kind: 'questions', phase: 'post' });
  });

  it('completed → result', () => {
    expect(resolveAttemptStatusRoute('completed')).toEqual({ kind: 'result' });
  });

  it('review (tamamlanmış eğitimi tekrar izleme) → result', () => {
    expect(resolveAttemptStatusRoute('review')).toEqual({ kind: 'result' });
  });

  it('expired → eğitim detayı', () => {
    expect(resolveAttemptStatusRoute('expired')).toEqual({ kind: 'training-detail' });
  });

  it('null/undefined → null (redirect kararı verilemez, mevcut ekranda kal)', () => {
    expect(resolveAttemptStatusRoute(null)).toBeNull();
    expect(resolveAttemptStatusRoute(undefined)).toBeNull();
  });
});

/** Test fixture — gerçekçi TrainingDetail; her test ilgili alanları override eder. */
function makeDetail(overrides: Partial<TrainingDetail>): TrainingDetail {
  return {
    id: 'training-1',
    assignmentId: 'assignment-1',
    title: 'El Hijyeni',
    category: 'Enfeksiyon',
    description: '',
    passingScore: 70,
    maxAttempts: 3,
    examDuration: 30,
    status: 'assigned',
    currentAttempt: 0,
    deadline: '2026-12-31',
    examOnly: false,
    isExpired: false,
    startDate: null,
    isNotStarted: false,
    preExamCompleted: false,
    videosCompleted: false,
    postExamCompleted: false,
    needsRetry: false,
    videos: [],
    ...overrides,
  };
}

describe('resolveTrainingDetailRoute', () => {
  it('locked eğitim → detayda kal (CTA kilitli)', () => {
    expect(resolveTrainingDetailRoute(makeDetail({ status: 'locked' }))).toEqual({
      kind: 'training-detail',
    });
  });

  it('henüz açılmamış eğitim → detayda kal', () => {
    expect(resolveTrainingDetailRoute(makeDetail({ isNotStarted: true }))).toEqual({
      kind: 'training-detail',
    });
  });

  it('fresh atama (assigned, attempt yok) → start (POST /start attempt yaratmalı)', () => {
    // KRİTİK: doğrudan questions/pre'ye gitmek 403/404 verir — attempt henüz yok.
    expect(resolveTrainingDetailRoute(makeDetail({ status: 'assigned' }))).toEqual({
      kind: 'start',
    });
  });

  it('retry hakkı olan başarısız eğitim → start (yeni attempt POST /start ister)', () => {
    expect(resolveTrainingDetailRoute(makeDetail({ status: 'failed', needsRetry: true }))).toEqual({
      kind: 'start',
    });
  });

  it('expired-retryable → start (baştan başlama POST /start ister)', () => {
    expect(
      resolveTrainingDetailRoute(makeDetail({ status: 'in_progress', isExpiredRetryable: true })),
    ).toEqual({ kind: 'start' });
  });

  it('süresi dolmuş (retry yok) → detayda kal', () => {
    expect(resolveTrainingDetailRoute(makeDetail({ status: 'failed', isExpired: true }))).toEqual({
      kind: 'training-detail',
    });
  });

  it('EXHAUSTED (failed, retry yok) → detayda kal (ek hak talebi formu orada)', () => {
    expect(resolveTrainingDetailRoute(makeDetail({ status: 'failed' }))).toEqual({
      kind: 'training-detail',
    });
  });

  it('geçilmiş eğitim → result', () => {
    expect(
      resolveTrainingDetailRoute(
        makeDetail({
          status: 'passed',
          currentAttempt: 1,
          preExamCompleted: true,
          videosCompleted: true,
          postExamCompleted: true,
        }),
      ),
    ).toEqual({ kind: 'result' });
  });

  it('in_progress + ön sınav yapılmamış → questions/pre (resume, start atlanır)', () => {
    expect(
      resolveTrainingDetailRoute(makeDetail({ status: 'in_progress', currentAttempt: 1 })),
    ).toEqual({ kind: 'questions', phase: 'pre' });
  });

  it('in_progress + ön sınav bitti, videolar bitmedi → videos (resume)', () => {
    expect(
      resolveTrainingDetailRoute(
        makeDetail({ status: 'in_progress', currentAttempt: 1, preExamCompleted: true }),
      ),
    ).toEqual({ kind: 'videos' });
  });

  it('in_progress + videolar bitti, son sınav bitmedi → questions/post (resume)', () => {
    expect(
      resolveTrainingDetailRoute(
        makeDetail({
          status: 'in_progress',
          currentAttempt: 1,
          preExamCompleted: true,
          videosCompleted: true,
        }),
      ),
    ).toEqual({ kind: 'questions', phase: 'post' });
  });

  it('examOnly + in_progress → doğrudan questions/post', () => {
    expect(
      resolveTrainingDetailRoute(
        makeDetail({ status: 'in_progress', currentAttempt: 1, examOnly: true }),
      ),
    ).toEqual({ kind: 'questions', phase: 'post' });
  });
});

describe('shouldRedirectExamRoute', () => {
  it('beklenen hedef yoksa (null) redirect yok', () => {
    expect(shouldRedirectExamRoute({ kind: 'videos' }, null)).toBe(false);
  });

  it('videos ekranındayken beklenen videos → redirect yok', () => {
    expect(shouldRedirectExamRoute({ kind: 'videos' }, { kind: 'videos' })).toBe(false);
  });

  it('videos ekranındayken beklenen post sınavı → redirect (tüm videolar bitti senaryosu)', () => {
    expect(shouldRedirectExamRoute({ kind: 'videos' }, { kind: 'questions', phase: 'post' })).toBe(
      true,
    );
  });

  it('pre sınavındayken beklenen pre → redirect yok', () => {
    expect(
      shouldRedirectExamRoute(
        { kind: 'questions', phase: 'pre' },
        { kind: 'questions', phase: 'pre' },
      ),
    ).toBe(false);
  });

  it('pre sınavındayken beklenen post → redirect (faz uyuşmazlığı)', () => {
    expect(
      shouldRedirectExamRoute(
        { kind: 'questions', phase: 'pre' },
        { kind: 'questions', phase: 'post' },
      ),
    ).toBe(true);
  });

  it('videos ekranındayken beklenen result → redirect (attempt tamamlanmış)', () => {
    expect(shouldRedirectExamRoute({ kind: 'videos' }, { kind: 'result' })).toBe(true);
  });
});
