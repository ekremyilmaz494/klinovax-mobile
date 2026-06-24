import { useQuery } from '@tanstack/react-query';
import { router, Stack as ExpoStack } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenError } from '@/components/ui/ScreenError';
import { ContentMaxWidth, Stack, Text, useTheme } from '@/design-system';
import { fetchCalendar } from '@/lib/api/calendar';
import { groupEventsByDay, monthLabel, monthParam, shiftMonth } from '@/lib/calendar/agenda';
import { useAuthStore } from '@/store/auth';
import type {
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
  CalendarResponse,
} from '@/types/calendar';

type AgendaTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const STATUS: Record<CalendarEventStatus, { label: string; tone: AgendaTone }> = {
  assigned: { label: 'Atandı', tone: 'info' },
  in_progress: { label: 'Devam', tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'success' },
  failed: { label: 'Kaldı', tone: 'danger' },
  locked: { label: 'Kilitli', tone: 'neutral' },
};

const EVENT_TYPE: Record<CalendarEventType, string> = { training: 'Eğitim', exam: 'Sınav' };

export default function CalendarScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  // Ayın 1'ine sabitlenmiş "görüntülenen ay". new Date() yalnızca ilk state'te.
  const [month, setMonth] = useState(() => shiftMonth(new Date(), 0));
  const [refreshing, setRefreshing] = useState(false);
  const monthStr = monthParam(month);

  const { data, isLoading, error, refetch } = useQuery<CalendarResponse, Error>({
    queryKey: ['staff-calendar', monthStr],
    enabled: !!user,
    queryFn: () => fetchCalendar(monthStr),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const sections = data ? groupEventsByDay(data.events) : [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Takvim' }} />

      <Stack
        direction="row"
        align="center"
        justify="space-between"
        gap={3}
        style={{
          paddingHorizontal: t.space[4],
          paddingVertical: t.space[3],
          backgroundColor: t.colors.surface.primary,
          borderBottomWidth: t.hairline,
          borderBottomColor: t.colors.border.subtle,
        }}
      >
        <MonthNavButton
          icon="chevron.left"
          label="Önceki ay"
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          t={t}
        />
        <Text variant="title-3" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {monthLabel(month)}
        </Text>
        <MonthNavButton
          icon="chevron.right"
          label="Sonraki ay"
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          t={t}
        />
      </Stack>

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Takvim yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              variant="overline"
              tone="tertiary"
              style={{
                paddingHorizontal: t.space[5],
                paddingTop: t.space[5],
                paddingBottom: t.space[2],
                backgroundColor: t.colors.surface.canvas,
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => <EventCard event={item} t={t} />}
          contentContainerStyle={{
            paddingBottom: t.space[12],
            flexGrow: 1,
            width: '100%',
            maxWidth: ContentMaxWidth.content,
            alignSelf: 'center',
          }}
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="Bu ayda etkinlik yok"
              description="Başka bir ay seçerek eğitim ve sınav son tarihlerini görebilirsin."
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.colors.accent.clay}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function MonthNavButton({
  icon,
  label,
  onPress,
  t,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.surface.secondary,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <IconSymbol name={icon} size={20} color={t.colors.text.primary} />
    </Pressable>
  );
}

function EventCard({ event, t }: { event: CalendarEvent; t: ReturnType<typeof useTheme> }) {
  const s = STATUS[event.status] ?? { label: event.status, tone: 'neutral' as AgendaTone };
  return (
    <Pressable
      onPress={() => router.push(`/trainings/${event.trainingId}`)}
      accessibilityRole="button"
      accessibilityLabel={`${EVENT_TYPE[event.eventType] ?? 'Eğitim'}: ${event.title}`}
      style={({ pressed }) => ({
        marginHorizontal: t.space[4],
        marginBottom: t.space[3],
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: t.space[4],
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <Stack
        direction="row"
        justify="space-between"
        align="center"
        style={{ marginBottom: t.space[2] }}
      >
        <Text variant="overline" tone="tertiary">
          {EVENT_TYPE[event.eventType] ?? 'Eğitim'}
        </Text>
        <Badge label={s.label} tone={s.tone} />
      </Stack>
      <Text variant="bodyEmph" numberOfLines={2}>
        {event.title}
      </Text>
      {event.category ? (
        <Text variant="footnote" tone="tertiary" style={{ marginTop: t.space[1] }}>
          {event.category}
        </Text>
      ) : null}
    </Pressable>
  );
}
