import { useEvent } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Text, useReducedMotion, useTheme } from '@/design-system';

import { VideoScrubber } from './VideoScrubber';

const AUTO_HIDE_MS = 3000;

function formatDuration(s: number): string {
  const safe = Math.max(0, Math.floor(s));
  const m = Math.floor(safe / 60);
  const r = safe % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Video oynatıcı kontrol katmanı — VideoView'in ÜZERİNE bindirilir (eski alttaki
 * çubuk yerine). YouTube benzeri: ekrana tek tap kontrolleri gösterir/gizler,
 * oynatılırken 3 sn sonra otomatik kaybolur; sol yarıya çift-tap 10 sn geri sarar.
 *
 * ANTI-CHEAT: ileri sarma fiziksel olarak yok — sağ yarı çift-tap no-op, scrubber
 * ileri sürükleme `clampSeekTarget`'a takılır (videos.tsx onSeekTo). Bu bileşen
 * yalnızca sunum; mantık (heartbeat, tamamlama, seek clamp) VideoBlock'ta kalır.
 */
export function VideoControlsOverlay({
  player,
  durationSeconds,
  isPlaying,
  muted,
  isFullscreen,
  onTogglePlay,
  onSeekBackward,
  onToggleMute,
  onSeekTo,
  onToggleFullscreen,
  hideFullscreen = false,
}: {
  player: VideoPlayer;
  durationSeconds: number;
  isPlaying: boolean;
  muted: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onSeekBackward: () => void;
  onToggleMute: () => void;
  onSeekTo: (seconds: number) => void;
  onToggleFullscreen: () => void;
  /** Ses içerikte tam ekran anlamsız — butonu gizler. */
  hideFullscreen?: boolean;
}) {
  const t = useTheme();
  const reduce = useReducedMotion();

  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(1);
  const widthSV = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Oynatılırken otomatik gizle; duraklatıldıysa kontroller kalsın (kullanıcı
  // ne yapacağına baksın). Reduce Motion açıkken de zamanlayıcı çalışır.
  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!isPlaying) return;
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, [clearHideTimer, isPlaying]);

  const show = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const toggleVisible = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  // visible değişince opacity animasyonu + zamanlayıcı yönetimi.
  useEffect(() => {
    opacity.value = reduce ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: 200 });
    if (visible) scheduleHide();
    else clearHideTimer();
  }, [visible, reduce, opacity, scheduleHide, clearHideTimer]);

  // Oynat/duraklat değişince: duraklayınca kontrolleri göster ve sabit tut.
  useEffect(() => {
    if (!isPlaying) {
      clearHideTimer();
      setVisible(true);
    } else {
      scheduleHide();
    }
  }, [isPlaying, clearHideTimer, scheduleHide]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  // Herhangi bir butona dokununca kontrolleri canlı tut (zamanlayıcıyı resetle).
  const keepAlive = useCallback(() => scheduleHide(), [scheduleHide]);

  const onLayout = (e: LayoutChangeEvent) => {
    widthSV.value = e.nativeEvent.layout.width;
  };

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(260)
    .onEnd(() => {
      runOnJS(toggleVisible)();
    });

  // Sol yarıya çift-tap → 10 sn geri. Sağ yarı kasıtlı no-op (ileri sarma yasak).
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (widthSV.value > 0 && e.x < widthSV.value / 2) {
        runOnJS(onSeekBackward)();
        runOnJS(show)();
      }
    });

  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);

  const controlsStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      onLayout={onLayout}
    >
      {/* Jest yakalayıcı (her zaman aktif) — kontroller gizliyken de tap onları açar. */}
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </GestureDetector>

      {/* Kontrol katmanı — box-none: boş alana dokunuş alttaki jest katmanına geçer,
          butonlar kendi dokunuşlarını yakalar. Gizliyken 'none' ile tamamen pasif. */}
      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, controlsStyle]}
      >
        {/* Scrim — ikon/metin okunurluğu için video'yu hafif karartır. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.colors.media.scrim,
          }}
        />

        {/* Merkez: büyük oynat/duraklat */}
        <View
          pointerEvents="box-none"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Pressable
            onPress={() => {
              onTogglePlay();
              keepAlive();
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Duraklat' : 'Oynat'}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: t.colors.media.buttonBg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <IconSymbol
              name={isPlaying ? 'pause.fill' : 'play.fill'}
              size={34}
              color={t.colors.media.control}
            />
          </Pressable>
        </View>

        {/* Alt bar: 10sn geri · süre · scrubber · ses · tam ekran */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 12,
            paddingBottom: isFullscreen ? 24 : 10,
            paddingTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <MediaButton
            icon="gobackward.10"
            label="10 saniye geri sar"
            onPress={() => {
              onSeekBackward();
              keepAlive();
            }}
            t={t}
          />
          <LiveTime
            player={player}
            durationSeconds={durationSeconds}
            color={t.colors.media.control}
          />
          <VideoScrubber
            player={player}
            durationSeconds={durationSeconds}
            onSeekTo={(s) => {
              onSeekTo(s);
              keepAlive();
            }}
          />
          <MediaButton
            icon={muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            label={muted ? 'Sesi aç' : 'Sesi kapat'}
            onPress={() => {
              onToggleMute();
              keepAlive();
            }}
            t={t}
          />
          {!hideFullscreen && (
            <MediaButton
              icon={
                isFullscreen
                  ? 'arrow.down.right.and.arrow.up.left'
                  : 'arrow.up.left.and.arrow.down.right'
              }
              label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
              onPress={() => {
                onToggleFullscreen();
                keepAlive();
              }}
              t={t}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/** Alt bar yuvarlak medya butonu — 40pt dokunma hedefi, koyu zemin + açık ikon. */
function MediaButton({
  icon,
  label,
  onPress,
  t,
}: {
  icon: IconSymbolName;
  label: string;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: t.colors.media.buttonBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconSymbol name={icon} size={20} color={t.colors.media.control} />
    </Pressable>
  );
}

/** Canlı süre göstergesi — timeUpdate'i izole eder (player'ı re-render etmez). */
function LiveTime({
  player,
  durationSeconds,
  color,
}: {
  player: VideoPlayer;
  durationSeconds: number;
  color: string;
}) {
  const timeUpdate = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const current = Math.min(timeUpdate?.currentTime ?? 0, durationSeconds);
  return (
    <Text
      variant="caption"
      maxFontSizeMultiplier={1.4}
      style={{ color, fontVariant: ['tabular-nums'] }}
    >
      {formatDuration(current)} / {formatDuration(durationSeconds)}
    </Text>
  );
}
