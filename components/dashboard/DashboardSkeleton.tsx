import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/design-system';

/** Sönük placeholder blok — Reduce Motion açıkken nabız atmaz (sabit opaklık). */
function SkeletonBlock({
  width = '100%',
  height,
  radius,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
}) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(0.6);

  useEffect(() => {
    if (reduce) {
      o.value = 0.6;
      return;
    }
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [reduce, o]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? t.radius.sm,
          backgroundColor: t.colors.surface.sunken,
        },
        style,
      ]}
    />
  );
}

/** Dashboard yükleniyor iskeleti — düz spinner yerine içerik düzenini taklit eder. */
export function DashboardSkeleton() {
  const t = useTheme();
  return (
    <View
      style={{ gap: t.space[6] }}
      accessibilityLabel="Yükleniyor"
      accessibilityRole="progressbar"
    >
      {/* Stat ızgarası */}
      <View
        style={{
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
          padding: t.space[4],
          gap: t.space[4],
        }}
      >
        <View style={{ flexDirection: 'row', gap: t.space[4] }}>
          <SkeletonBlock height={56} />
          <SkeletonBlock height={56} />
        </View>
        <View style={{ flexDirection: 'row', gap: t.space[4] }}>
          <SkeletonBlock height={56} />
          <SkeletonBlock height={56} />
        </View>
      </View>

      {/* İlerleme çubuğu */}
      <SkeletonBlock height={10} radius={5} />

      {/* Yaklaşan kartlar */}
      <View style={{ gap: t.space[3] }}>
        <SkeletonBlock width="40%" height={16} />
        <SkeletonBlock height={72} radius={t.radius.lg} />
        <SkeletonBlock height={72} radius={t.radius.lg} />
      </View>
    </View>
  );
}
