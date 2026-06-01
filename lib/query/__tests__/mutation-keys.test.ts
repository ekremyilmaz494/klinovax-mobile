import { isPersistedMutationKey, MUTATION_KEYS } from '../mutation-keys';

describe('isPersistedMutationKey', () => {
  it('3 persist key için true', () => {
    expect(isPersistedMutationKey(MUTATION_KEYS.saveAnswer)).toBe(true);
    expect(isPersistedMutationKey(MUTATION_KEYS.submitExam)).toBe(true);
    expect(isPersistedMutationKey(MUTATION_KEYS.completeVideo)).toBe(true);
  });

  it('bilinmeyen key için false', () => {
    expect(isPersistedMutationKey(['exam', 'heartbeat'])).toBe(false);
    expect(isPersistedMutationKey(['push', 'register'])).toBe(false);
  });

  it('boş veya undefined key için false', () => {
    expect(isPersistedMutationKey([])).toBe(false);
    expect(isPersistedMutationKey(undefined)).toBe(false);
  });
});

describe('MUTATION_KEYS literal sabitleri', () => {
  // AsyncStorage replay uyumu: bu string'ler değişirse rehydrate edilen eski
  // paused mutation'lar mutationFn'ini bulamaz. Snapshot değil literal assert —
  // bilinçli değişiklik gerektirir (buster/version bump ile birlikte).
  it("key string'leri sabit kalmalı", () => {
    expect(MUTATION_KEYS.saveAnswer).toEqual(['exam', 'save-answer']);
    expect(MUTATION_KEYS.submitExam).toEqual(['exam', 'submit']);
    expect(MUTATION_KEYS.completeVideo).toEqual(['exam', 'video-complete']);
  });
});
