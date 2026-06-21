import { View } from 'react-native';

import { badgeIcon, TIER_LABEL } from '@/components/gamification/badge-display';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconDot, Stack, Text, useTheme } from '@/design-system';
import { resolveLevel } from '@/lib/gamification/levels';
import type { GamificationSummary } from '@/types/gamification';

/**
 * Profil oyunlaştırma paneli: toplam puan + kazanılan/kilitli rozetler. Salt
 * gösterim (puan/rozet sunucuda hesaplanır). Kilitli rozet `filled={false}` ile
 * gri ring olarak görünür.
 *
 * Not: Backend summary rozet için yerelleştirilmiş ad döndürmüyor; alt etiket
 * şimdilik kademe (Bronz/Gümüş/Altın). İleride backend ad/açıklama eklerse onunla
 * değiştirilir.
 */
export function BadgesGallery({ summary }: { summary: GamificationSummary }) {
  const t = useTheme();
  const lvl = resolveLevel(summary.points);
  return (
    <View style={{ paddingVertical: t.space[4], gap: t.space[5] }}>
      <Stack direction="row" align="center" gap={3}>
        <IconDot variant="accent" icon="star.fill" size={40} />
        <View style={{ flex: 1 }}>
          <Text
            variant="metric"
            maxFontSizeMultiplier={1.6}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {summary.points}
          </Text>
          <Text variant="footnote" tone="tertiary">
            oyunlaştırma puanı · azalmaz
          </Text>
        </View>
      </Stack>

      {/* Seviye + sonraki seviyeye ilerleme — puanın statü/ilerleme katmanı. */}
      <View style={{ gap: t.space[2] }}>
        <Stack direction="row" justify="space-between" align="center">
          <Text variant="bodyEmph">
            Seviye {lvl.level} · {lvl.title}
          </Text>
          <Text variant="footnote" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
            {lvl.isMax ? 'En üst seviye' : `Sonraki seviyeye ${lvl.pointsToNext} puan`}
          </Text>
        </Stack>
        <ProgressBar value={Math.round(lvl.progress * 100)} height={8} />
      </View>

      {summary.badges.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[4] }}>
          {summary.badges.map((b) => (
            <View key={b.id} style={{ width: 68, alignItems: 'center', gap: t.space[2] }}>
              <IconDot
                variant={b.earned ? 'accent' : 'neutral'}
                icon={badgeIcon(b.icon)}
                size={44}
                filled={b.earned}
              />
              <Text
                variant="caption"
                tone={b.earned ? 'primary' : 'tertiary'}
                align="center"
                numberOfLines={1}
              >
                {TIER_LABEL[b.tier]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="footnote" tone="tertiary">
          Henüz rozet yok — pekiştirme ve sınavlarla kazanmaya başla.
        </Text>
      )}
    </View>
  );
}
