import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { API_BASE_URL } from '@/lib/config';

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
 */

/**
 * Query/mutation duraklatma kararı: SADECE kesin offline (uçak modu / hiç ağ yok)
 * durumunda true.
 *
 * `isInternetReachable` buraya BİLEREK dahil DEĞİL: reachability bir tahmindir ve
 * yanlış-negatif verdiğinde (2026-06-02 saha bulgusu: varsayılan Google reachability
 * check'i bazı cihaz/ağlarda sürekli fail ediyor) uygulamanın TÜM veri akışını
 * durduruyordu — login çalışırken dashboard/eğitimler boş kalıyordu. Tahmine
 * dayanarak istek atmamak, isteğin doğal olarak fail etmesinden çok daha kötü.
 */
export function isHardOffline(isConnected: boolean | null): boolean {
  return isConnected === false;
}

export function setupOnlineBridge(): () => void {
  // Reachability kontrolünü Google (varsayılan clients3.google.com/generate_204)
  // yerine KENDİ backend'imize yap: bu uygulama için önemli olan klinovax.com'a
  // erişim. Bazı hastane ağları / cihazlar Google check'ini engelleyip uygulamayı
  // yanlışlıkla offline moda sokuyordu. /api/health kimliksiz istekte statik
  // hafif JSON döner (DB/Redis kontrolü yok — backend yükü yaratmaz).
  NetInfo.configure({
    reachabilityUrl: `${API_BASE_URL}/api/health`,
    reachabilityTest: async (response) => response.status === 200,
    reachabilityRequestTimeout: 10_000,
    useNativeReachability: false,
  });

  let netInfoUnsub: (() => void) | null = null;
  onlineManager.setEventListener((setOnline) => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(!isHardOffline(state.isConnected));
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
