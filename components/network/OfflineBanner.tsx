import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@/design-system';
import { usePendingMutationCount } from '@/hooks/use-pending-mutation-count';
import { useOnline } from '@/lib/network/use-online';

/**
 * Üst sticky banner — üç durumdan birini gösterir:
 *   1) Offline + bekleyen mutation YOK → "İnternet yok — kayıtlı veriler"
 *      (warm amber)
 *   2) Offline + bekleyen mutation VAR → "İnternet yok — N işlem sırada"
 *   3) Online + bekleyen mutation VAR  → "N işlem gönderiliyor…" (clay accent)
 *   4) Online + bekleyen mutation YOK → hiçbir şey gösterme
 */
export function OfflineBanner() {
  const t = useTheme();
  const { isOnline } = useOnline();
  const pendingCount = usePendingMutationCount();
  const insets = useSafeAreaInsets();

  if (isOnline && pendingCount === 0) return null;

  const variant: 'offline' | 'syncing' = isOnline ? 'syncing' : 'offline';
  const message =
    variant === 'syncing'
      ? `${pendingCount} işlem gönderiliyor…`
      : pendingCount > 0
        ? `İnternet bağlantısı yok — ${pendingCount} işlem sırada bekliyor`
        : 'İnternet bağlantısı yok — kayıtlı veriler gösteriliyor';

  const bg = variant === 'syncing' ? t.colors.accent.clay : t.colors.status.warning;
  const fg = variant === 'syncing' ? t.colors.accent.clayOnAccent : '#FFFFFF';

  return (
    <SafeAreaView
      edges={['top']}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View style={[styles.banner, { backgroundColor: bg, marginTop: insets.top > 0 ? 0 : 4 }]}>
        <Ionicons
          name={variant === 'syncing' ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          size={16}
          color={fg}
        />
        <Text variant="subhead" numberOfLines={1} style={{ color: fg, flexShrink: 1 }}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
});
