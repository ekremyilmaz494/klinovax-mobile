import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/design-system';

/**
 * Tek seferlik kutlama katmanı — sınav geçme / eğitim tamamlama gibi NÖTR başarı
 * anlarında oynar (hasta-güvenliği/advers içerikte ASLA). Merkezden saçılan
 * parçacıklar + ışık halkaları, ~1.6sn sonra kendini söndürür (self-unmounting →
 * çağıran ekranda state/effect gerektirmez). `pointerEvents="none"` → altındaki
 * butonlar tıklanabilir kalır.
 *
 * Reduce Motion açıkken: hiç hareket yok, anında biter (erişilebilirlik, CLAUDE.md §7).
 * Yalnız reanimated (transform + opacity, UI thread) — yeni native bağımlılık YOK.
 */

// Merkez etrafında deterministik dağılım (Math.random YOK — seeded).
const PARTICLES: { angle: number; dist: number; size: number; delay: number }[] = [
  { angle: 12, dist: 150, size: 11, delay: 0.0 },
  { angle: 48, dist: 120, size: 8, delay: 0.04 },
  { angle: 85, dist: 168, size: 13, delay: 0.02 },
  { angle: 120, dist: 110, size: 9, delay: 0.06 },
  { angle: 158, dist: 150, size: 10, delay: 0.03 },
  { angle: 195, dist: 132, size: 12, delay: 0.05 },
  { angle: 232, dist: 160, size: 8, delay: 0.02 },
  { angle: 268, dist: 116, size: 11, delay: 0.07 },
  { angle: 300, dist: 150, size: 9, delay: 0.03 },
  { angle: 335, dist: 136, size: 13, delay: 0.05 },
  { angle: 20, dist: 92, size: 7, delay: 0.08 },
  { angle: 210, dist: 96, size: 7, delay: 0.08 },
];

export function CelebrationOverlay({ onFinish }: { onFinish?: () => void }) {
  const reduce = useReducedMotion();
  const t = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const p = useSharedValue(0);
  const [hidden, setHidden] = useState(false);

  const finish = useCallback(() => {
    setHidden(true);
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    if (reduce) {
      // Hareketsiz: görsel kutlama atlanır, hemen biter.
      finish();
      return;
    }
    p.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }, (done) => {
      'worklet';
      if (done) runOnJS(finish)();
    });
    // Ekran animasyon biterken kapanırsa (ör. butonla router.replace) iptal et →
    // unmount sonrası setHidden çağrısı / setState-after-unmount uyarısı olmasın.
    return () => cancelAnimation(p);
  }, [reduce, p, finish]);

  if (hidden || reduce) return null;

  const cx = W / 2;
  const cy = H / 2;
  const colorOf = (i: number) => (i % 2 === 0 ? t.colors.status.success : t.colors.accent.clay);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Ring p={p} cx={cx} cy={cy} color={t.colors.status.success} start={0} />
      <Ring p={p} cx={cx} cy={cy} color={t.colors.accent.clay} start={0.12} />
      {PARTICLES.map((cfg, i) => (
        <Particle key={i} cfg={cfg} p={p} cx={cx} cy={cy} color={colorOf(i)} />
      ))}
    </View>
  );
}

function Ring({
  p,
  cx,
  cy,
  color,
  start,
}: {
  p: SharedValue<number>;
  cx: number;
  cy: number;
  color: string;
  start: number;
}) {
  const D = 88;
  const style = useAnimatedStyle(() => {
    'worklet';
    const local = interpolate(p.value, [start, start + 0.6], [0, 1], 'clamp');
    return {
      transform: [{ scale: 0.3 + local * 3 }],
      opacity: interpolate(local, [0, 0.18, 1], [0, 0.32, 0]),
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cx - D / 2,
          top: cy - D / 2,
          width: D,
          height: D,
          borderRadius: D / 2,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

function Particle({
  cfg,
  p,
  cx,
  cy,
  color,
}: {
  cfg: { angle: number; dist: number; size: number; delay: number };
  p: SharedValue<number>;
  cx: number;
  cy: number;
  color: string;
}) {
  // Yön sabit (animasyonda değişmez) → Math worklet dışında hesaplanır.
  const rad = (cfg.angle * Math.PI) / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);
  const style = useAnimatedStyle(() => {
    'worklet';
    const local = interpolate(p.value, [cfg.delay, 1], [0, 1], 'clamp');
    const tx = dirX * cfg.dist * local;
    // Hafif yerçekimi: parçacık yükselip düşer.
    const ty = dirY * cfg.dist * local + 36 * local * local;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: interpolate(local, [0, 0.2, 1], [0, 1, 0.55], 'clamp') },
      ],
      opacity: interpolate(local, [0, 0.12, 0.7, 1], [0, 1, 1, 0], 'clamp'),
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cx - cfg.size / 2,
          top: cy - cfg.size / 2,
          width: cfg.size,
          height: cfg.size,
          borderRadius: cfg.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
