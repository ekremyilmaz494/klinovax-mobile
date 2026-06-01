import { ApiError } from '@/lib/api/client';

import { isAnswerLockError, rollbackAnswer } from '../answer-lock';

describe('isAnswerLockError', () => {
  it('ApiError 423 → true (post-exam cevap kilidi)', () => {
    expect(isAnswerLockError(new ApiError(423, { error: 'locked' }))).toBe(true);
  });

  it('ApiError 429 (rate limit) → false', () => {
    expect(isAnswerLockError(new ApiError(429, { error: 'too many' }))).toBe(false);
  });

  it('ApiError 0 (network) → false', () => {
    expect(isAnswerLockError(new ApiError(0, { error: 'offline' }))).toBe(false);
  });

  it('normal Error → false', () => {
    expect(isAnswerLockError(new Error('boom'))).toBe(false);
  });

  it('undefined / null → false', () => {
    expect(isAnswerLockError(undefined)).toBe(false);
    expect(isAnswerLockError(null)).toBe(false);
  });
});

describe('rollbackAnswer', () => {
  it('önceki cevap varsa o değere geri alır', () => {
    const answers = new Map<string, string>([
      ['q1', 'opt-new'],
      ['q2', 'opt-x'],
    ]);
    const next = rollbackAnswer(answers, 'q1', 'opt-old');
    expect(next.get('q1')).toBe('opt-old');
    expect(next.get('q2')).toBe('opt-x'); // diğer cevaplar dokunulmaz
  });

  it('önceki cevap yoksa (undefined) sorunun girişini siler', () => {
    const answers = new Map<string, string>([['q1', 'opt-new']]);
    const next = rollbackAnswer(answers, 'q1', undefined);
    expect(next.has('q1')).toBe(false);
  });

  it('orijinal Map mutasyona uğramaz (yeni Map döner)', () => {
    const answers = new Map<string, string>([['q1', 'opt-new']]);
    const next = rollbackAnswer(answers, 'q1', 'opt-old');
    expect(answers.get('q1')).toBe('opt-new'); // orijinal korunur
    expect(next).not.toBe(answers);
  });
});
