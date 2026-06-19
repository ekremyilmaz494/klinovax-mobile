import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text, useTheme } from '@/design-system';
import { useMarkAsRead } from '@/hooks/use-notifications';
import { timeAgo } from '@/lib/format/time-ago';
import type { NotificationItem } from '@/types/notifications';

import { NotificationTypeIcon } from './NotificationTypeIcon';

/**
 * Bildirim listesi kartı.
 *
 * Tap davranışı:
 *   1. Optimistic mark-as-read mutation → liste anında "okundu" görünümüne geçer
 *   2. `relatedTrainingId` varsa `/trainings/[id]`'ye navigate
 *      (yoksa sadece okundu işaretlenir, ekrandan çıkmaz)
 *
 * Tasarım (warm editorial):
 *   - Hairline border, gölge yok
 *   - Read: surface.primary; Unread: surface.secondary + clay unread dot
 *   - Sol: type-aware yuvarlak ikon
 *   - Orta: title (Inter Tight 600 unread / 500 read) + message + time-ago
 */
export const NotificationCard = memo(function NotificationCard({
  item,
}: {
  item: NotificationItem;
}) {
  const t = useTheme();
  const markAsRead = useMarkAsRead();

  const handlePress = () => {
    if (!item.isRead) markAsRead.mutate(item.id);
    if (item.relatedTrainingId) {
      router.push(`/trainings/${item.relatedTrainingId}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          backgroundColor: item.isRead ? t.colors.surface.primary : t.colors.surface.secondary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: item.isRead ? t.colors.border.subtle : t.colors.accent.clayMuted,
          padding: t.space[4],
          gap: t.space[3],
          alignItems: 'flex-start',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} bildirimi`}
      accessibilityHint={
        item.relatedTrainingId ? 'İlgili eğitime gider' : 'Okundu olarak işaretler'
      }
    >
      <View style={{ position: 'relative' }}>
        {!item.isRead ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              left: -2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: t.colors.accent.clay,
              borderWidth: 2,
              borderColor: t.colors.surface.secondary,
              zIndex: 2,
            }}
          />
        ) : null}
        <NotificationTypeIcon type={item.type} size={38} />
      </View>

      <View style={{ flex: 1, gap: t.space[1] }}>
        <Text variant="callout" numberOfLines={2} weight={item.isRead ? 'medium' : 'semibold'}>
          {item.title}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={3}>
          {item.message}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
});
