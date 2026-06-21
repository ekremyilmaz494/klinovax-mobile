import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Card, Stack, Text, useTheme } from '@/design-system';
import type { StreakState } from '@/types/gamification';

/**
 * Dashboard günlük seri (streak) kartı. Streak server-clock'tan gelir (cihaz saati
 * değil) — salt gösterim. `atRisk` ise "bugün çöz" uyarısı, değilse kalan dondurma
 * hakkı gösterilir.
 */
export function StreakWidget({ streak }: { streak: StreakState }) {
  const t = useTheme();
  return (
    <Card variant="accent" rail>
      <Stack direction="row" align="center" gap={3}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.colors.accent.clayMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconSymbol name="flame.fill" size={24} color={t.colors.accent.clay} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="tertiary">
            GÜNLÜK SERİ
          </Text>
          <Stack direction="row" align="center" gap={2}>
            <Text
              variant="metric"
              maxFontSizeMultiplier={1.6}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {streak.current}
            </Text>
            <Text variant="subhead" tone="tertiary">
              gün
            </Text>
          </Stack>
        </View>
        {streak.atRisk ? (
          <Badge label="bugün çöz" tone="warning" />
        ) : streak.freezesLeft > 0 ? (
          <Badge label={`${streak.freezesLeft} dondurma`} tone="info" />
        ) : null}
      </Stack>
    </Card>
  );
}
