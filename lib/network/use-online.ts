import NetInfo, { NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * Cihazın internet erişimini izleyen hook.
 *
 * `isConnected` cihaz bir networke bağlı mı (WiFi/4G), `isInternetReachable`
 * gerçekten dışarı çıkabiliyor mu (örn. captive portal hatası). İkisini AND'liyoruz —
 * "tam online" anlamı: connected + dışarıya ulaşabilir.
 *
 * `isInternetReachable` bazı eski Android'lerde `null` dönebilir (heuristic
 * henüz çalışmadı) — `null` durumunu *online sayıyoruz* (false negative riski
 * yerine "sessiz başarı" tercih ediyoruz; gerçekten offline ise zaten request
 * fail eder).
 */

export type OnlineStatus = {
  isOnline: boolean;
  isConnected: boolean;
  type: NetInfoState['type'];
};

export function useOnline(): OnlineStatus {
  const [state, setState] = useState<OnlineStatus>({
    isOnline: true,
    isConnected: true,
    type: NetInfoStateType.unknown,
  });

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      const connected = s.isConnected === true;
      const reachable = s.isInternetReachable !== false; // null ya da true → online say
      setState({
        isOnline: connected && reachable,
        isConnected: connected,
        type: s.type,
      });
    });
    // İlk değer için fetch
    void NetInfo.fetch().then((s) => {
      const connected = s.isConnected === true;
      const reachable = s.isInternetReachable !== false;
      setState({
        isOnline: connected && reachable,
        isConnected: connected,
        type: s.type,
      });
    });
    return () => sub();
  }, []);

  return state;
}
