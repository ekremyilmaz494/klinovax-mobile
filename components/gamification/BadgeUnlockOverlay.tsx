import { useEffect } from 'react';
import { Modal, View } from 'react-native';

import { badgeIcon, tierLabel } from '@/components/gamification/badge-display';
import { Button, Card, IconDot, Stack, Text, useTheme } from '@/design-system';
import { hapticSuccess } from '@/lib/haptics';
import type { NewBadge } from '@/types/gamification';

/**
 * Yeni rozet kazanım kutlaması — `useAward` kredi sonrası dönen `newBadges` ile
 * tetiklenir (boşsa hiç gösterilmez). Tek seferlik, kullanıcı "Harika" ile kapatır.
 *
 * Rozet için yerelleştirilmiş ad yok (backend yalnız code/tier/icon döner) → ikon +
 * kademe (Bronz/Gümüş/Altın) gösterilir; backend ad eklerse zenginleştirilir.
 * Açılışta başarı titreşimi (haptik; simülatörde no-op).
 */
export function BadgeUnlockOverlay({
  badges,
  onClose,
}: {
  badges: NewBadge[];
  onClose: () => void;
}) {
  const t = useTheme();

  useEffect(() => {
    hapticSuccess();
  }, []);

  if (badges.length === 0) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: t.colors.overlay.scrim,
          alignItems: 'center',
          justifyContent: 'center',
          padding: t.space[6],
        }}
      >
        <Card variant="accent" rail style={{ width: '100%', maxWidth: 360 }}>
          <Text variant="overline" style={{ color: t.colors.accent.clay, textAlign: 'center' }}>
            YENİ ROZET
          </Text>
          <Text variant="title-2" align="center" style={{ marginTop: t.space[2] }}>
            Tebrikler!
          </Text>
          <Text variant="body" tone="secondary" align="center" style={{ marginTop: t.space[1] }}>
            {badges.length > 1 ? `${badges.length} yeni rozet kazandın` : 'Yeni bir rozet kazandın'}
          </Text>

          <Stack
            direction="row"
            justify="center"
            gap={5}
            wrap
            style={{ marginTop: t.space[6], marginBottom: t.space[2] }}
          >
            {badges.map((b) => (
              <View key={b.id} style={{ width: 76, alignItems: 'center', gap: t.space[2] }}>
                <IconDot variant="accent" icon={badgeIcon(b.icon)} size={56} filled />
                <Text variant="caption" align="center" numberOfLines={1}>
                  {tierLabel(b.tier)}
                </Text>
              </View>
            ))}
          </Stack>

          <Button
            label="Harika"
            variant="primary"
            size="lg"
            onPress={onClose}
            fullWidth
            style={{ marginTop: t.space[6] }}
          />
        </Card>
      </View>
    </Modal>
  );
}
