import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Card, Text, useTheme } from '@/design-system';
import { fetchPendingFeedback } from '@/lib/api/feedback';
import { useAuthStore } from '@/store/auth';
import type { PendingFeedbackItem } from '@/types/feedback';

/**
 * Zorunlu geri bildirim uyarısı — bu form doldurulmadan personel YENİ eğitim
 * başlatamaz (backend start → 423). Hem Eğitimlerim hem Dashboard'da görünür ki
 * kullanıcı engeli proaktif öğrensin (start 423'üne çarpmadan). Tek
 * `['pending-feedback']` queryKey paylaşıldığı için iki ekranda da ekstra istek yok.
 * Bekleyen zorunlu form yoksa hiçbir şey render etmez (padding'li boşluk bırakmaz).
 */
export function MandatoryFeedbackBanner({
  containerStyle,
}: {
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ['pending-feedback'],
    enabled: !!user,
    queryFn: fetchPendingFeedback,
  });

  const mandatory = useMemo<PendingFeedbackItem | null>(() => {
    if (!data?.formActive) return null;
    return data.items.find((it) => it.isMandatory) ?? null;
  }, [data]);

  if (!mandatory) return null;

  return (
    <View style={containerStyle}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/feedback/[attemptId]',
            params: { attemptId: mandatory.attemptId, title: mandatory.trainingTitle },
          })
        }
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <Card variant="warning" rail>
          <Text variant="overline" style={{ color: t.colors.status.warning }}>
            ZORUNLU GERİ BİLDİRİM
          </Text>
          <Text variant="body" style={{ marginTop: t.space[2] }}>
            “{mandatory.trainingTitle}” eğitimi için geri bildirim formunu doldurmadan yeni eğitim
            başlatamazsın.
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}
