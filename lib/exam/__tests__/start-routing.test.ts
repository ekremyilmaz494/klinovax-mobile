import { ApiError } from '@/lib/api/client';

import { extractPendingFeedbackRoute, resolveStartRoute } from '../start-routing';

describe('resolveStartRoute', () => {
  it('pre_exam → questions phase=pre', () => {
    expect(resolveStartRoute('pre_exam')).toEqual({ kind: 'questions', phase: 'pre' });
  });

  it('post_exam → questions phase=post', () => {
    expect(resolveStartRoute('post_exam')).toEqual({ kind: 'questions', phase: 'post' });
  });

  it('watching_videos → videos', () => {
    expect(resolveStartRoute('watching_videos')).toEqual({ kind: 'videos' });
  });

  it('completed → result', () => {
    expect(resolveStartRoute('completed')).toEqual({ kind: 'result' });
  });
});

describe('extractPendingFeedbackRoute', () => {
  it('423 body içinden attemptId + trainingTitle çıkarır', () => {
    const err = new ApiError(423, {
      error: 'feedback required',
      pendingFeedback: { attemptId: 'att-1', trainingTitle: 'El Hijyeni' },
    });
    expect(extractPendingFeedbackRoute(err)).toEqual({
      attemptId: 'att-1',
      trainingTitle: 'El Hijyeni',
    });
  });

  it('423 ama attemptId yoksa → null (fallback bilgilendirme)', () => {
    const err = new ApiError(423, { error: 'feedback required', pendingFeedback: {} });
    expect(extractPendingFeedbackRoute(err)).toBeNull();
  });

  it('423 ama pendingFeedback hiç yoksa → null', () => {
    const err = new ApiError(423, { error: 'locked' });
    expect(extractPendingFeedbackRoute(err)).toBeNull();
  });

  it('423 olmayan ApiError → null', () => {
    expect(extractPendingFeedbackRoute(new ApiError(500, { error: 'server' }))).toBeNull();
  });

  it('normal Error → null', () => {
    expect(extractPendingFeedbackRoute(new Error('boom'))).toBeNull();
  });

  it('trainingTitle yoksa undefined döner ama attemptId taşınır', () => {
    const err = new ApiError(423, { pendingFeedback: { attemptId: 'att-9' } });
    expect(extractPendingFeedbackRoute(err)).toEqual({
      attemptId: 'att-9',
      trainingTitle: undefined,
    });
  });
});
