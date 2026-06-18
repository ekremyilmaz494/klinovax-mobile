import { createAttemptRequest } from '@/lib/api/attempt-requests';
import { ApiError } from '@/lib/api/client';
import { saveVideoProgress } from '@/lib/api/exam';
import { patchScormAttempt } from '@/lib/api/scorm';

import {
  isAlreadyProcessedError,
  registerMutationDefaults,
  shouldRetry,
} from '../mutation-defaults';
import { MUTATION_KEYS } from '../mutation-keys';

// mutationFn içini izole test etmek için API çağrıları mock'lanır.
jest.mock('@/lib/api/exam', () => ({
  saveExamAnswer: jest.fn().mockResolvedValue({ saved: true }),
  submitExam: jest.fn().mockResolvedValue({}),
  saveVideoProgress: jest.fn().mockResolvedValue({ progress: true, allVideosCompleted: false }),
}));

jest.mock('@/lib/api/attempt-requests', () => ({
  createAttemptRequest: jest
    .fn()
    .mockResolvedValue({ message: 'ok', request: { id: 'r1', status: 'pending', createdAt: 'x' } }),
}));

jest.mock('@/lib/api/scorm', () => ({
  patchScormAttempt: jest.fn().mockResolvedValue({ id: 's1', attemptId: 'a1' }),
}));

type CapturedConfig = { mutationFn: (vars: never) => unknown };

/** Kayıtlı default config'lerini key→config Map olarak toplayan sahte client.
 *  MUTATION_KEYS değerleri tuple (array) olduğundan Map (referans eşitliği) kullanılır. */
function captureDefaults(): Map<unknown, CapturedConfig> {
  const defaults = new Map<unknown, CapturedConfig>();
  const client = {
    setMutationDefaults: (key: unknown, config: CapturedConfig) => {
      defaults.set(key, config);
    },
  } as never;
  registerMutationDefaults(client);
  return defaults;
}

describe('shouldRetry', () => {
  it('4xx ApiError → retry yok (kalıcı hata)', () => {
    expect(shouldRetry(0, new ApiError(400, { error: 'bad' }))).toBe(false);
    expect(shouldRetry(0, new ApiError(423, { error: 'locked' }))).toBe(false);
    expect(shouldRetry(0, new ApiError(499, {}))).toBe(false);
  });

  it('5xx ApiError → failureCount<3 olduğu sürece retry', () => {
    expect(shouldRetry(0, new ApiError(500, {}))).toBe(true);
    expect(shouldRetry(2, new ApiError(503, {}))).toBe(true);
    expect(shouldRetry(3, new ApiError(503, {}))).toBe(false);
  });

  it('network (status 0) ApiError → retry', () => {
    expect(shouldRetry(0, new ApiError(0, { error: 'offline' }))).toBe(true);
  });

  it('ApiError olmayan exception → failureCount<3 retry', () => {
    expect(shouldRetry(1, new Error('timeout'))).toBe(true);
    expect(shouldRetry(3, new Error('timeout'))).toBe(false);
  });
});

describe('isAlreadyProcessedError', () => {
  it('409 → true (duplicate submit)', () => {
    expect(isAlreadyProcessedError(new ApiError(409, {}))).toBe(true);
  });

  it('422 → true', () => {
    expect(isAlreadyProcessedError(new ApiError(422, {}))).toBe(true);
  });

  it('diğer 4xx → false', () => {
    expect(isAlreadyProcessedError(new ApiError(400, {}))).toBe(false);
    expect(isAlreadyProcessedError(new ApiError(423, {}))).toBe(false);
  });

  it('ApiError olmayan → false', () => {
    expect(isAlreadyProcessedError(new Error('x'))).toBe(false);
  });
});

describe('registerMutationDefaults', () => {
  it('6 persist edilen mutation key için default kaydeder', () => {
    const setMutationDefaults = jest.fn();
    const client = { setMutationDefaults } as never;

    registerMutationDefaults(client);

    expect(setMutationDefaults).toHaveBeenCalledTimes(6);
    const registeredKeys = setMutationDefaults.mock.calls.map((c) => c[0]);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.saveAnswer);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.submitExam);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.saveVideoProgress);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.completeVideo);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.createAttemptRequest);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.patchScorm);
  });
});

describe('completeVideo mutationFn', () => {
  beforeEach(() => {
    (saveVideoProgress as jest.Mock).mockClear();
  });

  it('currentPage verilince saveVideoProgress completed:true + currentPage geçer (PDF)', async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.completeVideo)!.mutationFn({
      assignmentId: 'a1',
      videoId: 'v1',
      position: 5,
      watchedTime: 0,
      currentPage: 5,
    } as never);
    expect(saveVideoProgress).toHaveBeenCalledWith('a1', {
      videoId: 'v1',
      position: 5,
      watchedTime: 0,
      completed: true,
      currentPage: 5,
    });
  });

  it("currentPage yoksa body'de currentPage bulunmaz (video/ses tamamlama)", async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.completeVideo)!.mutationFn({
      assignmentId: 'a1',
      videoId: 'v1',
      position: 10,
      watchedTime: 8,
    } as never);
    expect(saveVideoProgress).toHaveBeenCalledWith('a1', {
      videoId: 'v1',
      position: 10,
      watchedTime: 8,
      completed: true,
    });
  });

  it('clientDuration verilince body’ye geçer (şişmiş DB duration fix — backend N2)', async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.completeVideo)!.mutationFn({
      assignmentId: 'a1',
      videoId: 'v1',
      position: 12,
      watchedTime: 11,
      clientDuration: 540,
    } as never);
    expect(saveVideoProgress).toHaveBeenCalledWith('a1', {
      videoId: 'v1',
      position: 12,
      watchedTime: 11,
      completed: true,
      clientDuration: 540,
    });
  });

  it('clientDuration yoksa body’de bulunmaz (eski davranış korunur)', async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.completeVideo)!.mutationFn({
      assignmentId: 'a1',
      videoId: 'v1',
      position: 3,
      watchedTime: 2,
    } as never);
    const body = (saveVideoProgress as jest.Mock).mock.calls[0][1];
    expect(body).not.toHaveProperty('clientDuration');
  });
});

describe('createAttemptRequest mutationFn', () => {
  beforeEach(() => {
    (createAttemptRequest as jest.Mock).mockClear();
  });

  it('offline-resume registry mutationFn createAttemptRequest’i trainingId+reason ile çağırır', async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.createAttemptRequest)!.mutationFn({
      trainingId: 't1',
      reason: 'Bağlantım koptu, yeniden denemek istiyorum.',
    } as never);
    expect(createAttemptRequest).toHaveBeenCalledWith({
      trainingId: 't1',
      reason: 'Bağlantım koptu, yeniden denemek istiyorum.',
    });
  });
});

describe('patchScorm mutationFn', () => {
  beforeEach(() => {
    (patchScormAttempt as jest.Mock).mockClear();
  });

  it('offline-resume registry mutationFn patchScormAttempt’i trainingId+patch ile çağırır', async () => {
    const defaults = captureDefaults();
    await defaults.get(MUTATION_KEYS.patchScorm)!.mutationFn({
      trainingId: 't1',
      patch: { lessonStatus: 'passed', score: 95 },
    } as never);
    // Tamamlama PATCH'i (passed) — offline iken paused, online'da replay → sertifika kaybolmaz.
    expect(patchScormAttempt).toHaveBeenCalledWith('t1', { lessonStatus: 'passed', score: 95 });
  });
});
