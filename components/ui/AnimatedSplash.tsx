import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette, useReducedMotion } from '@/design-system';

// Native splash ile birebir aynı zemin + mark → açılışta görsel sıçrama olmaz.
// app.json splash backgroundColor #C2410C (clay-600) + imageWidth 220 ile eşleşir.
const BG = Palette.clay[600];
const CREAM = Palette.parchment[50];
const LOGO = 220;

const MARK = require('../../assets/images/splash-mark.png');
const SPARKLE = require('../../assets/images/splash-sparkle.png');

// Kepin etrafına (mark'ın sağ-üstü) yerleşen pırıltılar — merkeze göre px offset.
const SPARKLES: { x: number; y: number; size: number; start: number }[] = [
  { x: 38, y: -74, size: 22, start: 0.16 },
  { x: 82, y: -42, size: 16, start: 0.24 },
  { x: 60, y: -2, size: 19, start: 0.32 },
  { x: 6, y: -94, size: 14, start: 0.2 },
  { x: 98, y: -70, size: 13, start: 0.4 },
];

interface Props {
  onFinish: () => void;
}

/**
 * Native splash kapandıktan sonra kısa süre oynayan "canlı" açılış katmanı:
 * logo hafif zıplar, arkasında ışık halkaları atar, kepin etrafında pırıltılar
 * belirir, zeminde parçacıklar süzülür → sonra fade ile uygulamayı açar.
 *
 * Reduce Motion açıkken: tüm hareket atlanır, yalnız logo gösterilip kısa fade
 * ile kapanır (erişilebilirlik kuralı — CLAUDE.md §7).
 */
export function AnimatedSplash({ onFinish }: Props) {
  const reduce = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();

  // Tek zaman çizgisi (one-shot): halka/pırıltı zamanlaması + sonda fade-out.
  const t = useSharedValue(0);
  // Sürekli döngü: parçacık süzülmesi + pırıltı twinkle.
  const loop = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      // Hareketsiz: yalnız logo görünür, kısa bekleme sonrası fade ile kapan.
      t.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }, (done) => {
        'worklet';
        if (done) runOnJS(onFinish)();
      });
      return;
    }
    loop.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    t.value = withTiming(1, { duration: 2400, easing: Easing.linear }, (done) => {
      'worklet';
      if (done) runOnJS(onFinish)();
    });
  }, [reduce, t, loop, onFinish]);

  // Tüm katman: en sonda (progress 0.84→1) yumuşak fade-out.
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(t.value, [0, 0.84, 1], [1, 1, 0]),
    };
  });

  // Logo: hafif "pop" (progress 0.08→0.46 arası 1 → 1.06 → 1).
  const logoStyle = useAnimatedStyle(() => {
    'worklet';
    const scale = reduce ? 1 : interpolate(t.value, [0.08, 0.27, 0.46], [1, 1.06, 1], 'clamp');
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.bg, containerStyle]}>
      {/* Arka plan parçacıkları (yalnız hareket açıkken) */}
      {!reduce && MOTES(W, H).map((m, i) => <Mote key={i} cfg={m} loop={loop} />)}

      {/* Logo arkası ışık halkaları */}
      {!reduce && <Ring t={t} start={0.12} />}
      {!reduce && <Ring t={t} start={0.34} />}

      <Animated.View style={logoStyle}>
        <Image source={MARK} style={{ width: LOGO, height: LOGO }} resizeMode="contain" />
        {/* Pırıltılar — logonun üstüne, kep çevresine */}
        {!reduce && SPARKLES.map((s, i) => <Sparkle key={i} cfg={s} t={t} loop={loop} />)}
      </Animated.View>
    </Animated.View>
  );
}

function Ring({ t, start }: { t: SharedValue<number>; start: number }) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = interpolate(t.value, [start, start + 0.5], [0, 1], 'clamp');
    return {
      transform: [{ scale: 0.35 + p * 2.1 }],
      opacity: interpolate(p, [0, 0.15, 1], [0, 0.3, 0]),
    };
  });
  const D = LOGO * 0.92;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: D,
          height: D,
          borderRadius: D / 2,
          borderWidth: 2,
          borderColor: CREAM,
        },
        style,
      ]}
    />
  );
}

function Sparkle({
  cfg,
  t,
  loop,
}: {
  cfg: { x: number; y: number; size: number; start: number };
  t: SharedValue<number>;
  loop: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const appear = interpolate(t.value, [cfg.start, cfg.start + 0.18], [0, 1], 'clamp');
    const twinkle = 0.55 + 0.45 * Math.sin(loop.value * Math.PI * 2 + cfg.x);
    return {
      opacity: appear * (0.5 + 0.5 * twinkle),
      transform: [{ scale: appear * (0.8 + 0.35 * twinkle) }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          // mark merkezi = LOGO/2; offset'i ona göre konumla
          left: LOGO / 2 + cfg.x - cfg.size / 2,
          top: LOGO / 2 + cfg.y - cfg.size / 2,
        },
        style,
      ]}
    >
      <Image source={SPARKLE} style={{ width: cfg.size, height: cfg.size }} resizeMode="contain" />
    </Animated.View>
  );
}

interface MoteCfg {
  x: number;
  y: number;
  size: number;
  drift: number;
  base: number;
  phase: number;
}

function Mote({ cfg, loop }: { cfg: MoteCfg; loop: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const tw = 0.5 + 0.5 * Math.sin(loop.value * Math.PI * 2 + cfg.phase);
    return {
      transform: [{ translateY: -loop.value * cfg.drift }],
      opacity: cfg.base * (0.4 + 0.6 * tw),
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cfg.x,
          top: cfg.y,
          width: cfg.size,
          height: cfg.size,
          borderRadius: cfg.size / 2,
          backgroundColor: CREAM,
        },
        style,
      ]}
    />
  );
}

// Ekran boyutuna göre dağılmış parçacıklar — deterministik (Math.random yok).
function MOTES(W: number, H: number): MoteCfg[] {
  const seeds = [
    [0.16, 0.22, 5, 28, 0.3, 0.0],
    [0.78, 0.18, 4, 34, 0.22, 1.1],
    [0.32, 0.74, 6, 24, 0.26, 2.0],
    [0.86, 0.62, 4, 30, 0.2, 0.6],
    [0.1, 0.55, 5, 26, 0.24, 3.0],
    [0.6, 0.34, 3, 32, 0.18, 1.7],
    [0.5, 0.86, 5, 22, 0.22, 2.6],
    [0.9, 0.4, 3, 28, 0.16, 0.9],
  ];
  return seeds.map(([fx, fy, size, drift, base, phase]) => ({
    x: fx * W,
    y: fy * H,
    size,
    drift,
    base,
    phase,
  }));
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
