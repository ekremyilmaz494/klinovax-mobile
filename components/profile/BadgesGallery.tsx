import { View } from 'react-native';

import { type IconSymbolName } from '@/components/ui/icon-symbol';
import { IconDot, Stack, Text, useTheme } from '@/design-system';
import type { BadgeTier, GamificationSummary } from '@/types/gamification';

/**
 * Backend badge.icon string'i (SF Symbol adı) → güvenli IconSymbolName.
 * Bilinmeyen ikon "blank" yerine `rosette`'e düşer (report uyarısı). Listedeki
 * isimlerin tümü icon-symbol MAPPING'inde tanımlı (compile-time doğrulanır).
 */
const BADGE_ICONS: IconSymbolName[] = [
  'checkmark.seal.fill',
  'rosette',
  'star.fill',
  'graduationcap.fill',
  'sparkles',
  'flame.fill',
  'trophy.fill',
  'medal.fill',
];

function badgeIcon(icon: string): IconSymbolName {
  return (BADGE_ICONS as string[]).includes(icon) ? (icon as IconSymbolName) : 'rosette';
}

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
};

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
