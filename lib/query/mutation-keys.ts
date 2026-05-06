/**
 * Persist edilen mutation'lar için **stabil** key sabitleri.
 *
 * `setMutationDefaults` registry'si bu key'lerle eşleşir; rehydrate edilen
 * paused mutation'lar key üzerinden mutationFn'i bulur. String'i değiştirmek
 * AsyncStorage'taki eski mutation'ları **bozar** — buster veya schema
 * version'ı bump'lamadan değiştirme.
 *
 * `as const` + tuple — `useMutation({ mutationKey })` literal type ile
 * eşleşsin diye. Yeni key eklerken aynı pattern'i koru.
 */
export const MUTATION_KEYS = {
  saveAnswer: ['exam', 'save-answer'] as const,
  submitExam: ['exam', 'submit'] as const,
  completeVideo: ['exam', 'video-complete'] as const,
} as const;

export type MutationKey =
  | typeof MUTATION_KEYS.saveAnswer
  | typeof MUTATION_KEYS.submitExam
  | typeof MUTATION_KEYS.completeVideo;

/**
 * Persist edilmesi GEREKEN key'lerin set'i. `shouldDehydrateMutation`
 * persister içinde bunu kontrol eder; listede olmayan mutation
 * (örn. heartbeat, push register) AsyncStorage'a yazılmaz.
 */
export const PERSISTED_MUTATION_KEYS: ReadonlySet<string> = new Set([
  MUTATION_KEYS.saveAnswer.join('/'),
  MUTATION_KEYS.submitExam.join('/'),
  MUTATION_KEYS.completeVideo.join('/'),
]);

export function isPersistedMutationKey(key: readonly unknown[] | undefined): boolean {
  if (!key || key.length === 0) return false;
  return PERSISTED_MUTATION_KEYS.has(key.map(String).join('/'));
}
