import { useQuery } from '@tanstack/react-query';

import { fetchGamificationSummary } from '@/lib/api/gamification';
import { useAuthStore } from '@/store/auth';
import type { GamificationSummary } from '@/types/gamification';

const KEY = ['gamification'] as const;

/**
 * Oyunlaştırma özeti query (puan + streak + rozet). Dashboard streak widget'ı ve
 * profil rozet/puan paneli tüketir. `staleTime: 5dk`; `enabled: !!user` ile
 * auth'sız 401 spam'ı önlenir. Günün Soruları gönderimi (submitDaily) başarıda bu
 * key'i invalidate eder (mutation-defaults) → puan/streak tazelenir.
 */
export function useGamification() {
  const user = useAuthStore((s) => s.user);
  return useQuery<GamificationSummary, Error>({
    queryKey: KEY,
    queryFn: () => fetchGamificationSummary(),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });
}
