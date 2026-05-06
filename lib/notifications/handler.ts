import { type QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Klinovax bildirim handler kurulumu — uygulama açıldığında ve foreground'da
 * gelen push'lar için davranış belirler.
 *
 * - **Foreground**: bildirim banner'ı, ses ve badge gösterilir (sessiz tutmak
 *   yerine kullanıcıya görsel/işitsel uyarı). iOS'ta varsayılan banner.
 *   Push received olduğunda `notifications` query invalidate edilir →
 *   bildirimler tab'ı açıksa feed üstte yeni item ile güncellenir.
 * - **Tap response**: kullanıcı bildirime dokunduğunda `data.url` varsa o
 *   in-app rotaya yönlendir (ör: `/trainings/abc`). Backend cron'lar bu URL'leri
 *   gönderir (bkz. `lib/expo-push.ts` payload `url` field). Tap sonrası da
 *   feed invalidate olur (kullanıcı detaydan dönerken senkron kalsın).
 *
 * `setupNotifications(queryClient)` `_layout.tsx`'te bir kez çağrılır.
 */

export function setupNotifications(queryClient: QueryClient): () => void {
  // Foreground'da gelen bildirimleri nasıl gösterelim?
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // banner göster
      shouldShowBanner: true, // iOS 14+
      shouldShowList: true, // Notification Center'da listele
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Foreground'da gelen her push → feed cache'i invalidate et. Backend zaten
  // cron'lardan önce `prisma.notification.create` yazıyor; bu listener tetik
  // anında en taze haliyle GET yapar.
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  // Tap response — uygulama background/closed iken bildirime tıklanırsa da
  // uygulama açıldığında bu listener tetiklenir (Expo getLastNotificationResponse
  // mekanizması üzerinden).
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const data = response.notification.request.content.data as { url?: string } | undefined;
    const url = data?.url;
    const ALLOWED_PREFIXES = ['/trainings/', '/exam/', '/certificates/'];
    if (typeof url === 'string' && ALLOWED_PREFIXES.some((p) => url.startsWith(p))) {
      try {
        router.push(url as never);
      } catch {
        // Geçersiz route — sessiz geç
      }
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
