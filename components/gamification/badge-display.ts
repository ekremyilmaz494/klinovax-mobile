import { type IconSymbolName } from '@/components/ui/icon-symbol';
import type { BadgeTier } from '@/types/gamification';

/**
 * Rozet gösterim yardımcıları — BadgesGallery + BadgeUnlockOverlay paylaşır.
 * Tek kaynak: ikon eşlemesi ve tier etiketi.
 */

/**
 * Backend badge.icon string'i (SF Symbol adı) → güvenli IconSymbolName.
 * Bilinmeyen ikon `rosette`'e düşer. Liste icon-symbol MAPPING'inde tanımlı
 * (compile-time doğrulanır).
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

export function badgeIcon(icon: string): IconSymbolName {
  return (BADGE_ICONS as string[]).includes(icon) ? (icon as IconSymbolName) : 'rosette';
}

/**
 * Backend yerelleştirilmiş rozet adı döndürmüyor; alt etiket kademe (Bronz/Gümüş/
 * Altın). İleride backend ad/açıklama eklerse onunla değiştirilir.
 */
export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: 'Bronz',
  silver: 'Gümüş',
  gold: 'Altın',
};

/** tier her zaman bilinen üç değerden biri değilse (backend serbest string) güvenli etiket. */
export function tierLabel(tier: string): string {
  return TIER_LABEL[tier as BadgeTier] ?? 'Rozet';
}
