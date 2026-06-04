import { useEvent } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/design-system';
import { progressPercent } from '@/lib/exam/video-scrubber';

const TRACK_HEIGHT = 4;
const THUMB = 14;

/**
 * Video ilerleme çubuğu — dokunma/sürükleme ile konuma gider AMA ileri-sarma
 * engeline tabidir: `onSeekTo` çağıran tarafta `clampSeekTarget` ile mevcut
 * konuma sınırlanır (ileri sürükleme → no-op, thumb geri yaslanır). Geri sürükleme
 * serbest. 1Hz timeUpdate'i izole eden tek alt-bileşen — player'ı re-render etmez.
 */
export function VideoScrubber({
  player,
  durationSeconds,
  onSeekTo,
}: {
  player: VideoPlayer;
  durationSeconds: number;
  onSeekTo: (seconds: number) => void;
}) {
  const t = useTheme();
  const reduce = useReducedMotion();

  const timeUpdate = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const current = Math.min(timeUpdate?.currentTime ?? 0, durationSeconds);

  const widthSV = useSharedValue(0);
  const fill = useSharedValue(0); // 0..1 dolgu oranı
  const dragging = useSharedValue(false);

  // timeUpdate → sürüklenmiyorken dolguyu canlı konuma getir.
  useEffect(() => {
    if (dragging.value) return;
    const frac = durationSeconds > 0 ? current / durationSeconds : 0;
    fill.value = reduce ? frac : withTiming(frac, { duration: 220 });
  }, [current, durationSeconds, reduce, fill, dragging]);

  const onLayout = (e: LayoutChangeEvent) => {
    widthSV.value = e.nativeEvent.layout.width;
  };

  // UI thread'den çağrılır — saniye hesabı + JS seek köprüsü.
  const commit = (frac: number) => {
    onSeekTo(frac * durationSeconds);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      const w = widthSV.value;
      if (w <= 0) return;
      fill.value = Math.max(0, Math.min(1, e.x / w));
    })
    .onEnd(() => {
      runOnJS(commit)(fill.value);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const w = widthSV.value;
    if (w <= 0) return;
    const frac = Math.max(0, Math.min(1, e.x / w));
    fill.value = frac;
    runOnJS(commit)(frac);
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: `${fill.value * 100}%`,
    transform: [{ translateX: -THUMB / 2 }, { scale: dragging.value ? 1.3 : 1 }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        hitSlop={{ top: 14, bottom: 14 }}
        style={{ flex: 1, height: THUMB + 6, justifyContent: 'center' }}
        accessibilityRole="adjustable"
        accessibilityLabel="Video ilerleme çubuğu"
        accessibilityValue={{ now: Math.round(progressPercent(current, durationSeconds)) }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: t.colors.media.track,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              {
                height: TRACK_HEIGHT,
                borderRadius: TRACK_HEIGHT / 2,
                backgroundColor: t.colors.accent.clay,
              },
              fillStyle,
            ]}
          />
        </View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: t.colors.accent.clay,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}
