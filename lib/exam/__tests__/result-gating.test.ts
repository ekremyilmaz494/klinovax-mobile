import type { TrainingDetail, TrainingFeedbackState } from '@/types/staff';

import { resolveFeedbackCta } from '../result-gating';

function detailWith(feedback: Partial<TrainingFeedbackState> | undefined) {
  return {
    feedback: feedback
      ? ({
          formActive: true,
          mandatory: false,
          submitted: false,
          submittedAt: null,
          canSubmit: false,
          attemptId: null,
          ...feedback,
        } as TrainingFeedbackState)
      : undefined,
  } as Pick<TrainingDetail, 'feedback'>;
}

describe('resolveFeedbackCta — canSubmit && !submitted && attemptId tablosu', () => {
  it('canSubmit + !submitted + attemptId → CTA döner', () => {
    expect(
      resolveFeedbackCta(detailWith({ canSubmit: true, submitted: false, attemptId: 'att-1' })),
    ).toEqual({ attemptId: 'att-1', mandatory: false });
  });

  it('mandatory bilgisi taşınır', () => {
    expect(
      resolveFeedbackCta(
        detailWith({ canSubmit: true, submitted: false, attemptId: 'att-2', mandatory: true }),
      ),
    ).toEqual({ attemptId: 'att-2', mandatory: true });
  });

  it('canSubmit false → null', () => {
    expect(
      resolveFeedbackCta(detailWith({ canSubmit: false, submitted: false, attemptId: 'att-1' })),
    ).toBeNull();
  });

  it('zaten submitted → null', () => {
    expect(
      resolveFeedbackCta(detailWith({ canSubmit: true, submitted: true, attemptId: 'att-1' })),
    ).toBeNull();
  });

  it('attemptId null → null', () => {
    expect(
      resolveFeedbackCta(detailWith({ canSubmit: true, submitted: false, attemptId: null })),
    ).toBeNull();
  });

  it('feedback alanı yoksa (eski backend) → null', () => {
    expect(resolveFeedbackCta(detailWith(undefined))).toBeNull();
  });

  it('detail null/undefined → null', () => {
    expect(resolveFeedbackCta(null)).toBeNull();
    expect(resolveFeedbackCta(undefined)).toBeNull();
  });
});
