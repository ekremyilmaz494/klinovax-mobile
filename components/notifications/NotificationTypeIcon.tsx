import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '@/design-system';
import type { NotificationType } from '@/types/notifications';

/**
 * Bildirim tipine göre yuvarlak ikon — warm editorial palet ile uyumlu.
 * Bilinmeyen tipler "info" stiline düşer.
 */

type IconKey = keyof typeof Ionicons.glyphMap;

type VisualSpec = {
  icon: IconKey;
  fg: keyof ReturnType<typeof useTheme>['colors']['status'] | 'accent' | 'mutedAccent';
};

const TYPE_ICON: Record<string, VisualSpec> = {
  reminder: { icon: 'time-outline', fg: 'warning' },
  warning: { icon: 'warning-outline', fg: 'warning' },
  error: { icon: 'alert-circle-outline', fg: 'danger' },
  info: { icon: 'information-circle-outline', fg: 'info' },
  success: { icon: 'checkmark-circle-outline', fg: 'success' },
  announcement: { icon: 'megaphone-outline', fg: 'accent' },
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
      <Ionicons name={v.icon} size={iconSize} color={fgColor} />
    </View>
  );
}
