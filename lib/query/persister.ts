import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { type PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { isPersistedMutationKey } from './mutation-keys';

/**
 * React Query offline persistence — `QueryClient` cache'i AsyncStorage'a serialize
 * edilir. Uygulama kapanıp açıldığında cache hidrate olur, internet yoksa son
 * görülen veri ekranda kalır.
 *
 * `maxAge: 24h` — bunun ötesindeki cache silinir (sağlık personeli stale veriyle
 * yanılmasın). `buster` schema değişikliklerinde tüm cache'i invalidate etmek
 * için kullanılır; uygulama versiyonuna bağlı tutmak doğal — `app.json` version
 * değişince eski cache atılır.
 *
 * Hem **read** query'leri hem **kritik mutation'lar** persist edilir:
 *   - Query: success state olanlar (error/pending tutulmaz)
 *   - Mutation: `MUTATION_KEYS` whitelist'inde olanlar (heartbeat hariç). Paused
 *     mutation'lar app restart sonrası rehydrate olunca `mutation-defaults.ts`
 *     registry'sinden mutationFn'i bulur ve online'a dönünce auto-replay olur.
 */

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'klinovax-query-cache-v1',
  throttleTime: 1_000, // 1sn'lik debounce — write storm önler
});

export async function clearPersistedQueryCache(): Promise<void> {
  await persister.removeClient?.();
}

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: 'v1.0.0', // app.json version ile manuel sync — bump'lanırsa eski cache atılır
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success',
    /**
     * Paused (offline) veya pending mutation'lar persist edilir; idle/success/error
     * tutulmaz — başarılı bir mutation'ı tekrar oynatmanın anlamı yok. Sadece
     * whitelist'teki key'ler kabul edilir; heartbeat gibi geçici mutation'lar
     * offline'da drop edilsin.
     */
    shouldDehydrateMutation: (mutation) => {
      if (!isPersistedMutationKey(mutation.options.mutationKey)) return false;
      return mutation.state.isPaused || mutation.state.status === 'pending';
    },
  },
};
