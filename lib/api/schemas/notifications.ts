import { z } from 'zod';

/**
 * `types/notifications.ts` runtime guard'ı. `type` backend'de esnek `varchar(50)` —
 * yeni tipler (`subscription_expiry` vb.) mobile koduna dokunmadan eklenebilsin diye
 * `z.string()` (bilinen tipler union'da ama şema gevşek). Diğer alanlar yapısal.
 */

const notificationItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  relatedTrainingId: z.string().nullable(),
  relatedTraining: z.looseObject({ id: z.string(), title: z.string() }).nullable(),
});

export const notificationsResponseSchema = z.looseObject({
  notifications: z.array(notificationItemSchema),
  unreadCount: z.number(),
});
