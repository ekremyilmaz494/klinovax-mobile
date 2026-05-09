import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
          padding: 14,
          gap: 12,
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
            style={[
              StyleSheet.absoluteFillObject,
              {
                top: -2,
                left: -2,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: t.colors.accent.clay,
                borderWidth: 2,
                borderColor: t.colors.surface.secondary,
                zIndex: 2,
                position: 'absolute',
              },
            ]}
          />
        ) : null}
        <NotificationTypeIcon type={item.type} size={38} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: item.isRead ? 'InterTight_500Medium' : 'InterTight_600SemiBold',
            fontSize: 15,
            lineHeight: 20,
            color: t.colors.text.primary,
          }}
        >
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
