import NetInfo, { NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Cihazın çevrim içi durumunu izleyen hook.
 *
 * `isOnline` TEK doğruluk kaynağından okunur: TanStack `onlineManager`. Onu iki
 * sinyal besler:
 *   1. NetInfo bridge (lib/query/online-bridge.ts) — yalnızca KESİN offline
 *      (isConnected=false) durumunda offline'a çeker.
 *   2. Gerçeklik geri bildirimi (lib/api/client.ts fetchOrThrow) — herhangi bir
 *      HTTP yanıtı geldiğinde online'a çeker.
 *
 * Bu sayede banner ("İnternet bağlantısı yok") ile sorgu davranışı asla çelişmez:
 * banner görünüyorsa sorgular da durmuştur, veri geliyorsa banner da yoktur.
 * Eski tasarım NetInfo'nun isInternetReachable tahminine bakıyordu — iOS
 * Simulator'da / bazı ağlarda yanlış-negatif verip uygulamayı kilitliyor.
 *
 * `isConnected` ve `type` NetInfo'dan ham bilgi olarak sunulmaya devam eder
 * (UI'da "WiFi/hücresel" göstermek isteyen tüketiciler için).
 */

export type OnlineStatus = {
  isOnline: boolean;
  isConnected: boolean;
  type: NetInfoState['type'];
};

export function useOnline(): OnlineStatus {
  const [state, setState] = useState<OnlineStatus>(() => ({
    isOnline: onlineManager.isOnline(),
    isConnected: true,
    type: NetInfoStateType.unknown,
  }));

  useEffect(() => {
    const unsubOnline = onlineManager.subscribe((isOnline) => {
      setState((prev) => (prev.isOnline === isOnline ? prev : { ...prev, isOnline }));
    });
    const unsubNetInfo = NetInfo.addEventListener((s) => {
      setState((prev) => ({
        ...prev,
        isConnected: s.isConnected === true,
        type: s.type,
      }));
    });
    return () => {
      unsubOnline();
      unsubNetInfo();
    };
  }, []);

  return state;
}
