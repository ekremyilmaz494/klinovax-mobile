import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDailyQuestions, submitDailyAnswers } from '@/lib/api/daily';
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
 * Quiz cevaplarını gönderir. `networkMode: 'online'` (mark-as-read gibi):
 * offline-resume kuyruğuna ALINMAZ — günlük quiz zaman-hassas ve offline replay
 * yalnız backend submit'i idempotent (submissionId dedup) GARANTİ ettiğinde
 * güvenli (plan §7 + backend istek listesi). Başarıda feed invalidate edilir →
 * dueCount güncellenir / kart kaybolur.
 */
export function useSubmitDailyQuestions() {
  const qc = useQueryClient();
  return useMutation<DailySubmitResponse, Error, { submissionId: string; answers: DailyAnswer[] }>({
    mutationFn: (vars) => submitDailyAnswers(vars),
    networkMode: 'online',
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
