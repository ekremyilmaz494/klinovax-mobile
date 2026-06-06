import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Card, IconDot, Stack, Text, useTheme } from '@/design-system';
import { fetchCalendar } from '@/lib/api/calendar';
import { upcomingSections } from '@/lib/calendar/agenda';
import { useAuthStore } from '@/store/auth';
import type { CalendarEvent, CalendarEventStatus, CalendarResponse } from '@/types/calendar';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_TONE: Record<CalendarEventStatus, { label: string; tone: Tone }> = {
  assigned: { label: 'Atandı', tone: 'info' },
  in_progress: { label: 'Devam', tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'success' },
  failed: { label: 'Kaldı', tone: 'danger' },
  locked: { label: 'Kilitli', tone: 'neutral' },
};

const MAX_GROUPS = 2;

/**
 * Dashboard ajanda önizlemesi — takvim API'sinden bu ayın yaklaşan etkinliklerini
 * tarih gruplu gösterir. queryKey takvim ekranıyla AYNI (`['staff-calendar', month]`):
 * cache paylaşılır, ekrana geçince anında dolu gelir, fazladan istek atılmaz.
 *
 * todayKey + monthStr ekrandan (new Date) gelir — bu bileşen deterministik kalır.
 */
export function AgendaPreview({ todayKey, monthStr }: { todayKey: string; monthStr: string }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery<CalendarResponse, Error>({
    queryKey: ['staff-calendar', monthStr],
    enabled: !!user,
    queryFn: () => fetchCalendar(monthStr),
  });

  const sections = data ? upcomingSections(data.events, todayKey, MAX_GROUPS) : [];

  return (
    <View>
      <Stack
        direction="row"
        justify="space-between"
        align="center"
        style={{ marginBottom: t.space[3] }}
      >
        <Text variant="title-2">Yaklaşan</Text>
        <Pressable
          onPress={() => router.push('/calendar')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Takvimi aç"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Stack direction="row" align="center" gap={1}>
            <Text variant="subhead" style={{ color: t.colors.accent.clay }}>
              Takvim
            </Text>
            <IconSymbol name="chevron.right" size={16} color={t.colors.accent.clay} />
          </Stack>
        </Pressable>
      </Stack>

      {sections.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Yaklaşan etkinlik yok"
          description="Bu ay planlı eğitim ya da sınav kalmadı."
        />
      ) : (
        <View style={{ gap: t.space[4] }}>
          {sections.map((s) => (
            <View key={s.dayKey} style={{ gap: t.space[2] }}>
              <Text variant="overline" tone="tertiary">
                {s.title}
              </Text>
              <View style={{ gap: t.space[2] }}>
                {s.data.map((e) => (
                  <AgendaRow key={e.id} event={e} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AgendaRow({ event }: { event: CalendarEvent }) {
  const status = STATUS_TONE[event.status];
  const isExam = event.eventType === 'exam';
  return (
    <Pressable
      onPress={() => router.push(`/trainings/${event.trainingId}`)}
      accessibilityRole="button"
      accessibilityLabel={`${isExam ? 'Sınav' : 'Eğitim'}: ${event.title}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <Card>
        <Stack direction="row" align="center" gap={3}>
          <IconDot
            variant={isExam ? 'accent' : 'neutral'}
            size={24}
            icon={isExam ? 'checkmark.seal.fill' : 'play.fill'}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodyEmph" numberOfLines={1}>
              {event.title}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
              {isExam ? 'Sınav' : 'Eğitim'}
              {event.category ? ` · ${event.category}` : ''}
            </Text>
          </View>
          <Badge label={status.label} tone={status.tone} />
        </Stack>
      </Card>
    </Pressable>
  );
}
