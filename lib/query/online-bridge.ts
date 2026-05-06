import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * NetInfo state'ini TanStack Query'nin `onlineManager`'ına forward eder.
 *
 * Bu olmazsa TanStack offline'da bile request başlatır → `networkMode:
 * 'offlineFirst'` mutation'ları paused state'e gitmez, hemen fail olur.
 * Bridge kurulduktan sonra:
 *   - offline → mutation paused, query background fetch durur
 *   - online'a dönüş → paused mutation'lar otomatik replay, query auto-refetch
 *
 * `_layout.tsx` mount'unda bir kez kurulur; cleanup fonksiyonu unmount'ta
 * subscription'ı kapatır (test/HMR senaryolarında leak önler).
 *
 * Reachability null → online sayıyoruz (use-online.ts ile aynı bias).
 */
export function setupOnlineBridge(): () => void {
  let netInfoUnsub: (() => void) | null = null;
  onlineManager.setEventListener((setOnline) => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const reachable = state.isInternetReachable !== false;
      setOnline(connected && reachable);
    });
    netInfoUnsub = unsub;
    // setup function bir cleanup dönmeli; TanStack listener swap'larda çağırır
    return unsub;
  });
  return () => {
    netInfoUnsub?.();
    netInfoUnsub = null;
  };
}
