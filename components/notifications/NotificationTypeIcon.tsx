import { View } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useTheme } from '@/design-system';
import type { NotificationType } from '@/types/notifications';

/**
 * Bildirim tipine göre yuvarlak ikon — warm editorial palet ile uyumlu.
 * Bilinmeyen tipler "info" stiline düşer. İkon sistemi DS standardı IconSymbol
 * (iOS SF Symbols / Android Material) — Ionicons'tan taşındı (tutarlılık).
 */

type VisualSpec = {
  icon: IconSymbolName;
  fg: keyof ReturnType<typeof useTheme>['colors']['status'] | 'accent' | 'mutedAccent';
};

const TYPE_ICON: Record<string, VisualSpec> = {
  reminder: { icon: 'clock', fg: 'warning' },
  warning: { icon: 'exclamationmark.triangle.fill', fg: 'warning' },
  error: { icon: 'exclamationmark.circle.fill', fg: 'danger' },
  info: { icon: 'info.circle.fill', fg: 'info' },
  success: { icon: 'checkmark.circle.fill', fg: 'success' },
  announcement: { icon: 'megaphone.fill', fg: 'accent' },
};
const FALLBACK = TYPE_ICON.info;

export function NotificationTypeIcon({
  type,
  size = 38,
}: {
  type: NotificationType;
  size?: number;
}) {
  const t = useTheme();
  const v = TYPE_ICON[type] ?? FALLBACK;

  let fgColor: string;
  let bgColor: string;

  if (v.fg === 'accent') {
    fgColor = t.colors.accent.clay;
    bgColor = t.colors.accent.clayMuted;
  } else if (v.fg === 'mutedAccent') {
    fgColor = t.colors.accent.clayHover;
    bgColor = t.colors.surface.secondary;
  } else {
    const status = t.colors.status[v.fg];
    fgColor = status;
    bgColor = t.colors.status[`${v.fg}Bg` as 'successBg' | 'warningBg' | 'dangerBg' | 'infoBg'];
  }

  const iconSize = Math.round(size * 0.55);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconSymbol name={v.icon} size={iconSize} color={fgColor} />
    </View>
  );
}
