import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button, Stack, Text, useReducedMotion, useTheme } from '@/design-system';

export type PhaseTransitionModalProps = {
  visible: boolean;
  /** Üst chip'te gösterilecek bağlam (örn. "ÖN SINAV TAMAMLANDI"). */
  overline: string;
  /** Display başlığı (örn. "Şimdi videolara geçiliyor"). */
  title: string;
  /** Açıklama satırı. */
  body: string;
  /** Süre dolduğunda gidilecek hedefin label'ı, butonda da görünür. */
  ctaLabel: string;
  /** Skor varsa gösterilir (ön sınav sonrası gibi). 0–100. */
  score?: number;
  /** İkon — son sınav uyarısı için 'exclamationmark.triangle.fill'. */
  icon?: 'checkmark.seal.fill' | 'play.fill' | 'exclamationmark.triangle.fill' | 'sparkles';
  /** Geri sayım saniyesi — 0 olursa otomatik ilerleme. */
  durationSeconds?: number;
  /** Süre dolduğunda VEYA kullanıcı butona basınca tetiklenir. */
  onContinue: () => void;
  /** Aksent rengini override etmek için (uyarı modunda warning, başarıda success). */
  tone?: 'clay' | 'success' | 'warning';
};

/**
 * Eğitim akışındaki faz geçişlerinde (ön sınav→videolar, videolar→son sınav)
 * kullanılan ortak modal. Geri sayım dolunca veya kullanıcı CTA'ya basınca
 * `onContinue` çağrılır. Native Alert yerine kullanılır — Warm Editorial
 * tipografisi ve clay/sand paleti ile.
 */
export function PhaseTransitionModal({
  visible,
  overline,
  title,
  body,
  ctaLabel,
  score,
  icon = 'sparkles',
  durationSeconds = 60,
  onContinue,
  tone = 'clay',
}: PhaseTransitionModalProps) {
  const t = useTheme();
  const reducedMotion = useReducedMotion();
  const [remaining, setRemaining] = useState(durationSeconds);
  const firedRef = useRef(false);

  const accent =
    tone === 'success'
      ? t.colors.status.success
      : tone === 'warning'
        ? t.colors.status.warning
        : t.colors.accent.clay;
  const accentBg =
    tone === 'success'
      ? t.colors.status.successBg
      : tone === 'warning'
        ? t.colors.status.warningBg
        : t.colors.accent.clayMuted;

  // Geri sayım: visible true olduğunda kuruluyor, false olunca temizleniyor.
  // firedRef sayesinde aynı modal içinde onContinue iki kere fırlamaz
  // (timer + butonun aynı anda tetiklenmesine karşı).
  useEffect(() => {
    if (!visible) {
      setRemaining(durationSeconds);
      firedRef.current = false;
      return;
    }
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setRemaining(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        onContinue();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [visible, durationSeconds, onContinue]);

  // İkon halka pulse — clay aksent, reduce motion'da kapalı.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!visible || reducedMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );
  }, [visible, reducedMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const handlePress = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onContinue();
  };

  const progress =
    durationSeconds === 0 ? 100 : ((durationSeconds - remaining) / durationSeconds) * 100;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Pressable
          accessibilityLabel="Geçişi onayla"
          onPress={handlePress}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <View
            style={{
              backgroundColor: t.colors.surface.primary,
              borderRadius: t.radius.xl,
              borderWidth: t.hairline,
              borderColor: t.colors.border.subtle,
              overflow: 'hidden',
            }}
          >
            {/* Üst banner */}
            <View
              style={{
                backgroundColor: accentBg,
                paddingTop: 28,
                paddingBottom: 22,
                paddingHorizontal: 24,
                alignItems: 'center',
                borderBottomWidth: t.hairline,
                borderBottomColor: t.colors.border.subtle,
              }}
            >
              <Animated.View
                style={[
                  {
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: t.colors.surface.primary,
                    borderWidth: 1.5,
                    borderColor: accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  },
                  pulseStyle,
                ]}
              >
                <IconSymbol name={icon} size={28} color={accent} />
              </Animated.View>

              <Text
                variant="overline"
                style={{
                  color: accent,
                  letterSpacing: 1.6,
                  textAlign: 'center',
                }}
              >
                {overline}
              </Text>
              <Text
                italic
                variant="title-1"
                style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 8 }}
              >
                {title}
              </Text>

              {typeof score === 'number' ? (
                <Stack direction="row" align="baseline" gap={2} style={{ marginTop: 16 }}>
                  <Text variant="footnote" tone="tertiary">
                    Skorunuz
                  </Text>
                  <Text
                    italic
                    style={{
                      fontFamily: 'Fraunces_700Bold',
                      fontSize: 36,
                      lineHeight: 38,
                      letterSpacing: -1,
                      color: t.colors.text.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    %{Math.round(score)}
                  </Text>
                </Stack>
              ) : null}
            </View>

            {/* Gövde */}
            <View style={{ padding: 24 }}>
              <Text variant="body" tone="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                {body}
              </Text>

              {/* Geri sayım */}
              <View style={{ marginTop: 24 }}>
                <Stack
                  direction="row"
                  justify="space-between"
                  align="center"
                  style={{ marginBottom: 8 }}
                >
                  <Stack direction="row" align="center" gap={2}>
                    <IconSymbol name="clock.fill" size={12} color={t.colors.text.tertiary} />
                    <Text variant="overline" tone="tertiary">
                      OTOMATİK GEÇİŞ
                    </Text>
                  </Stack>
                  <Text
                    style={{
                      fontFamily: 'Fraunces_700Bold',
                      fontSize: 18,
                      lineHeight: 20,
                      color: accent,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatCountdown(remaining)}
                  </Text>
                </Stack>
                <ProgressBar value={progress} height={6} color={accent} />
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ marginTop: 10, textAlign: 'center' }}
                >
                  Süre dolunca otomatik olarak devam edilecek.
                </Text>
              </View>

              <View style={{ marginTop: 22 }}>
                <Button
                  label={ctaLabel}
                  variant="primary"
                  size="lg"
                  onPress={handlePress}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
