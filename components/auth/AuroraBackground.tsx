import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/design-system/tokens';
import { useReducedMotion } from '@/design-system/useReducedMotion';
import { useTheme } from '@/design-system';

const { width: W, height: H } = Dimensions.get('window');

interface OrbConfig {
  color: string;
  size: number;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  durationMs: number;
  phase: number;
  opacity: number;
}

function Orb({ cfg, reduce }: { cfg: OrbConfig; reduce: boolean }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: cfg.durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [t, reduce, cfg.durationMs]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = t.value * Math.PI * 2 + cfg.phase;
    return {
      transform: [
        { translateX: Math.sin(angle) * cfg.driftX },
        { translateY: Math.cos(angle) * cfg.driftY },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: cfg.baseX,
          top: cfg.baseY,
          width: cfg.size,
          height: cfg.size,
          borderRadius: cfg.size / 2,
          backgroundColor: cfg.color,
          opacity: cfg.opacity,
        },
        animatedStyle,
      ]}
    />
  );
}

export function AuroraBackground() {
  const t = useTheme();
  const reduce = useReducedMotion();
  const isDark = t.mode === 'dark';

  const orbs: OrbConfig[] = [
    {
      color: isDark ? Palette.clay[600] : Palette.clay[400],
      size: 420,
      baseX: -120,
      baseY: -80,
      driftX: 60,
      driftY: 40,
      durationMs: 9000,
      phase: 0,
      opacity: isDark ? 0.18 : 0.32,
    },
    {
      color: isDark ? Palette.sage[600] : Palette.sage[400],
      size: 360,
      baseX: W - 200,
      baseY: H * 0.35,
      driftX: 50,
      driftY: 70,
      durationMs: 11000,
      phase: Math.PI / 2,
      opacity: isDark ? 0.14 : 0.26,
    },
    {
      color: isDark ? Palette.amber[600] : Palette.amber[400],
      size: 380,
      baseX: -80,
      baseY: H - 280,
      driftX: 70,
      driftY: 50,
      durationMs: 13000,
      phase: Math.PI,
      opacity: isDark ? 0.12 : 0.22,
    },
    {
      color: isDark ? Palette.clay[500] : Palette.clay[300],
      size: 280,
      baseX: W * 0.25,
      baseY: H * 0.55,
      driftX: 40,
      driftY: 60,
      durationMs: 15000,
      phase: Math.PI * 1.4,
      opacity: isDark ? 0.16 : 0.28,
    },
  ];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      {orbs.map((cfg, i) => (
        <Orb key={i} cfg={cfg} reduce={reduce} />
      ))}
      {/* Soft veil to keep text readable */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(21,19,15,0.35)' : 'rgba(245,241,234,0.45)',
        }}
      />
    </View>
  );
}
