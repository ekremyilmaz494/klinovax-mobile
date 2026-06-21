import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchDailyQuestions } from '@/lib/api/daily';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import { useAuthStore } from '@/store/auth';
import type { DailyAnswer, DailyQuestionsResponse, DailySubmitResponse } from '@/types/daily';

const KEY = ['daily-questions'] as const;

/**
 * Günün Soruları feed query. Eğitim sonrası opsiyonel pekiştirme — zorunlu
 * sınavdan ayrı. Dashboard kartının görünürlüğünü `data?.available` sürer.
 * `staleTime: 5dk` — foreground'a dönüşte makul tazelik. `enabled: !!user` ile
 * auth'sız 401 spam'ı önlenir (use-notifications deseni).
 */
export function useDailyQuestions() {
  const user = useAuthStore((s) => s.user);
  return useQuery<DailyQuestionsResponse, Error>({
    queryKey: KEY,
    queryFn: () => fetchDailyQuestions(),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });
}

/**
 * Quiz cevaplarını gönderir. mutationFn/networkMode/retry/invalidate
 * `mutation-defaults.ts`'te `MUTATION_KEYS.submitDaily` altında kayıtlı:
 * offline-resume (offlineFirst + persist) — dead-zone'da gönderilen cevap
 * kaybolmaz, online dönünce replay olur. Backend submissionId ile idempotent
 * olduğu için çift puan riski yok. Ekran, sonuç/queued durumunu per-call
 * onSuccess + useOnline ile yönetir (offline'da sunucu-hesaplı sonuç gösterilemez).
 */
export function useSubmitDailyQuestions() {
  return useMutation<DailySubmitResponse, Error, { submissionId: string; answers: DailyAnswer[] }>({
    mutationKey: MUTATION_KEYS.submitDaily,
  });
}
