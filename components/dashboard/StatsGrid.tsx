import { View } from 'react-native';

import { StatCard } from '@/components/ui/StatCard';
import { Stack, useTheme } from '@/design-system';
import type { DashboardStats } from '@/types/staff';

/**
 * 2×2 istatistik ızgarası — hairline ile bölünmüş tek yüzey (shadow yok).
 * Dashboard'dan çıkarıldı: ekran JSX'i sadeleşsin, ızgara tek yerde dursun.
 */
export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const t = useTheme();
  const vDivider = <View style={{ width: t.hairline, backgroundColor: t.colors.border.subtle }} />;
  const hDivider = <View style={{ height: t.hairline, backgroundColor: t.colors.border.subtle }} />;

  return (
    <View
      style={{
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        overflow: 'hidden',
      }}
    >
      <Stack direction="row">
        <StatCard label="Atanan" value={stats.assigned} tone="info" flat />
        {vDivider}
        <StatCard label="Devam" value={stats.inProgress} tone="warning" flat />
      </Stack>
      {hDivider}
      <Stack direction="row">
        <StatCard label="Tamamlanan" value={stats.completed} tone="success" flat />
        {vDivider}
        <StatCard label="Başarısız" value={stats.failed} tone="danger" flat />
      </Stack>
    </View>
  );
}
