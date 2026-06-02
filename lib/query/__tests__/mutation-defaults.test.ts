import { ApiError } from '@/lib/api/client';

import {
  isAlreadyProcessedError,
  registerMutationDefaults,
  shouldRetry,
} from '../mutation-defaults';
import { MUTATION_KEYS } from '../mutation-keys';

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
  it('4 persist edilen mutation key için default kaydeder', () => {
    const setMutationDefaults = jest.fn();
    const client = { setMutationDefaults } as never;

    registerMutationDefaults(client);

    expect(setMutationDefaults).toHaveBeenCalledTimes(4);
    const registeredKeys = setMutationDefaults.mock.calls.map((c) => c[0]);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.saveAnswer);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.submitExam);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.saveVideoProgress);
    expect(registeredKeys).toContainEqual(MUTATION_KEYS.completeVideo);
  });
});
