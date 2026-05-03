import { useMutationState } from '@tanstack/react-query'

import { isPersistedMutationKey } from '@/lib/query/mutation-keys'

/**
 * Persist edilen mutation kuyruğunda **paused** (offline'da bekleyen) veya
 * halen **pending** (network'e gidiyor ama henüz cevap yok) mutation sayısı.
 *
 * `OfflineBanner` bu sayıyı kullanıcıya gösterir: "N işlem sırada" /
 * "N işlem gönderiliyor". Kullanıcı kayıp endişesi yaşamasın diye somut
 * bir sayı önemli.
 */
export function usePendingMutationCount(): number {
  return useMutationState({
    filters: {
      predicate: (mutation) => {
        if (!isPersistedMutationKey(mutation.options.mutationKey)) return false
        return mutation.state.isPaused || mutation.state.status === 'pending'
      },
    },
    select: () => 1 as const,
  }).length
}
