import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@/design-system';
import { usePendingMutationCount } from '@/hooks/use-pending-mutation-count';
import { useOnline } from '@/lib/network/use-online';

/**
 * Üst sticky banner — YALNIZCA çevrimdışıyken görünür:
 *   1) Offline + bekleyen mutation YOK → "İnternet yok — kayıtlı veriler" (warm amber)
 *   2) Offline + bekleyen mutation VAR → "İnternet yok — N işlem sırada bekliyor"
 *   3) Online → hiçbir şey gösterme
 *
 * Eskiden online + bekleyen mutation durumunda "N işlem gönderiliyor…" anlık banner'ı
 * vardı; ama her mutation (sınav şıkkı kaydı, video heartbeat) bunu saniyede çakıp
 * söndürüyordu — rahatsız edici ve gereksizdi (işlemler arka planda güvenle gidiyor,
 * kayıp riski yok). Online sync göstergesi kaldırıldı; sadece çevrimdışı bilgisi kaldı.
 */
export function OfflineBanner() {
  const t = useTheme();
  const { isOnline } = useOnline();
  const pendingCount = usePendingMutationCount();
  const insets = useSafeAreaInsets();

  // Online iken hiçbir şey gösterme — flaş'ın kaynağı buydu.
  if (isOnline) return null;

  const message =
    pendingCount > 0
      ? `İnternet bağlantısı yok — ${pendingCount} işlem sırada bekliyor`
      : 'İnternet bağlantısı yok — kayıtlı veriler gösteriliyor';

  const bg = t.colors.status.warning;
  const fg = '#FFFFFF';

  return (
    <SafeAreaView
      edges={['top']}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View style={[styles.banner, { backgroundColor: bg, marginTop: insets.top > 0 ? 0 : 4 }]}>
        <Ionicons name="cloud-offline-outline" size={16} color={fg} />
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
