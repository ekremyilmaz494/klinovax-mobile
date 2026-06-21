import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgendaPreview } from '@/components/dashboard/AgendaPreview';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { MandatoryFeedbackBanner } from '@/components/feedback/MandatoryFeedbackBanner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Card, IconDot, Stack, Text, useTheme } from '@/design-system';
import { useDailyQuestions } from '@/hooks/use-daily-questions';
import { ApiError } from '@/lib/api/client';
import { fetchDashboard, fetchStaffProfile } from '@/lib/api/staff';
import { monthParam } from '@/lib/calendar/agenda';
import { useAuthStore } from '@/store/auth';
import type { DailyQuestionsResponse } from '@/types/daily';
import type {
  DashboardResponse,
  RecentActivity,
  StaffProfile,
  UrgentTraining,
} from '@/types/staff';

/** Yerel tarihten 'YYYY-MM-DD' — ajanda filtre anahtarı (tz kaymasız). */
function dayKeyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DashboardScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [refreshing, setRefreshing] = useState(false);
  // new Date() ilk render'da — ajanda filtre/ay anahtarları render içinde sabit kalsın.
  // Arka plandan dönüşte (gün/ay sınırı aşılmış olabilir) tazelenir (aşağıdaki effect).
  const [now, setNow] = useState(() => new Date());
  const monthStr = monthParam(now);
  const todayKey = dayKeyOf(now);

  // Uygulama foreground'a dönünce now'u tazele: tab uzun açık kalıp gece yarısını/ay
  // sınırını geçtiyse anahtarlar bayat günü gösteriyordu (pull-to-refresh düzeltmiyordu,
  // çünkü query key'in kendisi bayattı). Aynı günse türetilen string'ler değişmez → refetch yok.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  const { data, isLoading, error, refetch } = useQuery<DashboardResponse, Error>({
    queryKey: ['staff-dashboard'],
    queryFn: fetchDashboard,
    enabled: !!user,
  });

  // Selamlama için isim — profil tab'ıyla aynı queryKey, cache paylaşılır.
  const { data: profile } = useQuery<StaffProfile, Error>({
    queryKey: ['staff', 'profile'],
    enabled: !!user,
    queryFn: fetchStaffProfile,
  });
  const firstName = profile?.firstName?.trim() ?? '';
  // Profesyonel bağlam: unvan · departman (varsa) — daha önce kullanılmıyordu.
  const subtitle = [profile?.title, profile?.department].filter(Boolean).join(' · ');

  // Günün Soruları (spaced-repetition) — kartın görünürlüğünü `available` sürer.
  const { data: dailyQuiz } = useDailyQuestions();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[12] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent.clay}
          />
        }
      >
        {/* Hero — Warm Editorial brand selamlaması (display variant, brand istisnası). */}
        <View style={{ marginBottom: t.space[6] }}>
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
            HOŞ GELDİN
          </Text>
          <Text variant="display" italic tone="primary" numberOfLines={2}>
            Merhaba{firstName ? `, ${firstName}` : ''}
          </Text>
          {subtitle ? (
            <Text
              variant="subhead"
              tone="tertiary"
              numberOfLines={1}
              style={{ marginTop: t.space[1] }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {isLoading && !data ? <DashboardSkeleton /> : null}

        {error && !data ? (
          <ScreenError
            message={error.message || 'Dashboard verileri yüklenemedi.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {data ? (
          <View style={{ gap: t.space[6] }}>
            {/* Zorunlu geri bildirim engeli — ana ekranda proaktif uyarı (start 423'üne çarpmadan). */}
            <MandatoryFeedbackBanner />
            {data.urgentTraining ? <UrgentCard item={data.urgentTraining} /> : null}

            <StatsGrid stats={data.stats} />

            {dailyQuiz?.available ? <DailyQuizCard data={dailyQuiz} /> : null}

            <View>
              <Stack
                direction="row"
                justify="space-between"
                align="center"
                style={{ marginBottom: t.space[2] }}
              >
                <Text variant="title-2">Genel ilerleme</Text>
                <Text
                  variant="metricSmall"
                  maxFontSizeMultiplier={1.6}
                  style={{ color: t.colors.accent.clay, fontVariant: ['tabular-nums'] }}
                >
                  %{data.stats.overallProgress}
                </Text>
              </Stack>
              <ProgressBar value={data.stats.overallProgress} height={10} />
            </View>

            <AgendaPreview todayKey={todayKey} monthStr={monthStr} />

            <View>
              <Text variant="title-2" style={{ marginBottom: t.space[3] }}>
                Son aktivite
              </Text>
              {data.recentActivity.length === 0 ? (
                <EmptyState icon="clock" title="Henüz aktivite yok" />
              ) : (
                <Card padding={0}>
                  <View style={{ paddingVertical: t.space[1], paddingLeft: t.space[1] }}>
                    {data.recentActivity.map((a, i) => (
                      <ActivityItem
                        key={`${a.time}-${i}`}
                        item={a}
                        isFirst={i === 0}
                        isLast={i === data.recentActivity.length - 1}
                      />
                    ))}
                  </View>
                </Card>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function UrgentCard({ item }: { item: UrgentTraining }) {
  const t = useTheme();
  return (
    // Kart tıklanabilir: kullanıcı "acil eğitim" uyarısından doğrudan eğitim
    // detayına gidip başlayabilmeli.
    <Pressable
      onPress={() => router.push(`/trainings/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Acil eğitim: ${item.title}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <Card variant="accent" rail>
        <Text variant="overline" style={{ color: t.colors.accent.clay, marginBottom: t.space[2] }}>
          ACİL EĞİTİM
        </Text>
        <Text variant="title-3" numberOfLines={2}>
          {item.title}
        </Text>
        <Stack
          direction="row"
          justify="space-between"
          align="center"
          style={{ marginTop: t.space[2] }}
        >
          <Badge label={`${item.daysLeft} gün kaldı`} tone="danger" />
          <Text variant="subhead" style={{ color: t.colors.accent.clay }}>
            Eğitime git →
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}

function DailyQuizCard({ data }: { data: DailyQuestionsResponse }) {
  const t = useTheme();
  return (
    // Eğitim sonrası kısa pekiştirme — kart doğrudan /daily-quiz ekranına götürür.
    <Pressable
      onPress={() => router.push('/daily-quiz')}
      accessibilityRole="button"
      accessibilityLabel={`Günün soruları: ${data.dueCount} soru`}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <Card variant="accent" rail>
        <Text variant="overline" style={{ color: t.colors.accent.clay, marginBottom: t.space[2] }}>
          GÜNÜN SORULARI
        </Text>
        <Text variant="title-3" numberOfLines={2}>
          Bugünün kısa tekrarını tamamla
        </Text>
        <Stack
          direction="row"
          justify="space-between"
          align="center"
          style={{ marginTop: t.space[2] }}
        >
          <Badge label={`${data.dueCount} soru`} tone="info" />
          <Text variant="subhead" style={{ color: t.colors.accent.clay }}>
            Başla →
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}

function ActivityItem({
  item,
  isFirst,
  isLast,
}: {
  item: RecentActivity;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useTheme();
  const variant =
    item.type === 'success' ? 'success' : item.type === 'error' ? 'danger' : 'neutral';
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: t.space[3],
        paddingRight: t.space[4],
        gap: t.space[3],
      }}
    >
      {/* Timeline rail */}
      <View style={{ width: 22, alignItems: 'center' }}>
        {!isFirst ? (
          <View
            style={{
              width: t.hairline * 2,
              height: 12,
              backgroundColor: t.colors.accent.clayMuted,
            }}
          />
        ) : (
          <View style={{ height: 12 }} />
        )}
        <IconDot variant={variant} size={20} />
        {!isLast ? (
          <View
            style={{
              width: t.hairline * 2,
              flex: 1,
              backgroundColor: t.colors.accent.clayMuted,
              minHeight: 8,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingTop: t.space[3] }}>
        <Text variant="body" numberOfLines={2}>
          {item.text}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {item.time}
        </Text>
      </View>
    </View>
  );
}
