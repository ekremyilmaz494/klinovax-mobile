import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'

/**
 * iOS app icon kırmızı sayı badge'i. Cron push'larda backend `badge` field
 * göndermediği için biz `unreadCount` değişiminde lokal olarak set ederiz —
 * kullanıcı bildirimi okuduğunda home screen'deki sayı düşsün.
 *
 * `Device.isDevice` guard simulator'da `setBadgeCountAsync` no-op
 * davranışını çevreler; gerçek cihazda Android'de no-op (channel bağımlı).
 * Hata yutulur — badge UX kritik değil, push akışı bozulmamalı.
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (!Device.isDevice) return
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count))
  } catch {
    // sessiz — badge sync best-effort
  }
}
