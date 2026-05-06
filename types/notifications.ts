/**
 * Backend `/api/staff/notifications` endpoint response tipleri.
 *
 * Backend'deki `Notification` modeli `type` alanını esnek `varchar(50)` olarak
 * tutuyor — yeni tipler (örn. `subscription_expiry`) eklenince mobile koduna
 * dokunmaya gerek yok, sadece `NotificationTypeIcon` map'inde fallback'e
 * düşer. Bilinen tipleri union olarak yazıyoruz; bilinmeyen tipler yine
 * geçerli (`string` fallback).
 */

export type KnownNotificationType =
  | 'reminder' // cron yakın deadline (3/1 gün kala)
  | 'warning' // cron overdue / certificate expiring
  | 'info' // admin custom info
  | 'success' // admin custom success
  | 'error' // admin custom error
  | 'announcement'; // admin global broadcast

export type NotificationType = KnownNotificationType | (string & {});

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  relatedTrainingId: string | null;
  relatedTraining: { id: string; title: string } | null;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}
