import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications'
import { useAuthStore } from '@/store/auth'
import type { NotificationsResponse } from '@/types/notifications'

const KEY = ['notifications'] as const

/**
 * Bildirim feed query. `staleTime: 30s` — kullanıcı tab'a girince taze gelir,
 * 30sn içinde tekrar focus'lanırsa ekstra request atılmaz. Tab focus'taki
 * `useFocusEffect` ile birlikte kullanılır (sayfada).
 *
 * Push handler foreground'da bu query'i invalidate ederek anlık güncelleme
 * sağlar (yeni bildirim geldiğinde feed üstte yeni item görünür).
 */
export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  return useQuery<NotificationsResponse, Error>({
    queryKey: KEY,
    queryFn: () => fetchNotifications(),
    staleTime: 30_000,
    // Auth'sız 401 spam'ı önle — AuthGate sadece authed'lerde tabs'a yönlendirse
    // de race condition'a karşı güvenlik
    enabled: !!user,
  })
}

/** Sadece unread count çıkarmak için ince selector — tab badge'inde kullanılır. */
export function useUnreadCount(): number {
  const { data } = useNotifications()
  return data?.unreadCount ?? 0
}

/**
 * Mark-as-read mutation. Optimistic update: cache anında mutate edilir, network
 * fail olursa eski snapshot rollback. Persist queue'ya alınmaz (`networkMode:
 * 'online'` default) — bildirim okutmak idempotent + kayıp tolere edilir
 * (sonraki tab focus'ta state senkronize olur).
 */
export function useMarkAsRead() {
  const qc = useQueryClient()

  return useMutation<{ success: true }, Error, string, { previous: NotificationsResponse | undefined }>({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<NotificationsResponse>(KEY)
      qc.setQueryData<NotificationsResponse>(KEY, (old) => {
        if (!old) return old
        const target = old.notifications.find((n) => n.id === id)
        const wasUnread = target ? !target.isRead : false
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
          unreadCount: wasUnread ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
        }
      })
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

/**
 * Tümünü okundu — toplu işaret. Optimistic: tüm notifs `isRead=true`,
 * unreadCount=0. Hata olursa rollback.
 */
export function useMarkAllAsRead() {
  const qc = useQueryClient()

  return useMutation<{ success: true }, Error, void, { previous: NotificationsResponse | undefined }>({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<NotificationsResponse>(KEY)
      qc.setQueryData<NotificationsResponse>(KEY, (old) => {
        if (!old) return old
        return {
          ...old,
          notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
