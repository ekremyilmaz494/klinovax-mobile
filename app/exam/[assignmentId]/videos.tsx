import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { onlineManager, useMutation, useQuery } from '@tanstack/react-query';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PhaseTransitionModal } from '@/components/exam/PhaseTransitionModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, IconDot, Stack, Tag, Text, useTheme } from '@/design-system';
import { fetchExamVideos } from '@/lib/api/exam';
import { resolveAttemptStatusRoute, shouldRedirectExamRoute } from '@/lib/exam/route-guard';
import {
  buildCompletionWatchedTime,
  shouldCompleteVideo,
  shouldFlushHeartbeat,
} from '@/lib/exam/video-completion';
import { clampSeekTarget } from '@/lib/exam/video-seek';
import { API_BASE_URL } from '@/lib/config';
import type { CompleteVideoVars, SaveVideoProgressVars } from '@/lib/query/mutation-defaults';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import { useAuthStore } from '@/store/auth';
import type { ExamVideoItem, ExamVideosResponse, VideoProgressResponse } from '@/types/exam';

/**
 * Video aşaması ekranı — eğitim videoları sırayla izlenir, her tamamlanma
 * backend'e POST edilir. Tüm zorunlu (non-pdf) videolar bittiğinde backend
 * `allVideosCompleted: true` döner ve attempt status `post_exam`'a geçer.
 */
export default function VideosScreen() {
  const t = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  // Zustand auth store'dan oku — refresh sonrası listener tarafından sync ediliyor.
  // SecureStore I/O'su her AppState resume'da yapılmıyor.
  const accessToken = useAuthStore((s) => s.accessToken);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [postExamModal, setPostExamModal] = useState(false);

  const { data, error, isLoading, refetch } = useQuery<ExamVideosResponse, Error>({
    queryKey: ['exam-videos', assignmentId],
    queryFn: () => fetchExamVideos(assignmentId),
  });

  // Route guard: GET /videos yanıtındaki attemptStatus bu ekranla uyuşmuyorsa
  // (örn. tüm videolar bitmiş, attempt post_exam'a geçmiş) kullanıcıyı doğru faza
  // yönlendir. PhaseTransitionModal açıkken devreye girmez — modal aynı geçişi
  // geri sayımla zaten yapıyor; ikisi birden tetiklenirse modal yarıda kesilir.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!data || postExamModal || redirectedRef.current) return;
    const expected = resolveAttemptStatusRoute(data.attemptStatus);
    if (!shouldRedirectExamRoute({ kind: 'videos' }, expected)) return;
    redirectedRef.current = true;
    switch (expected.kind) {
      case 'questions':
        router.replace(`/exam/${assignmentId}/questions?phase=${expected.phase}`);
        break;
      case 'result':
        router.replace(`/exam/${assignmentId}/result`);
        break;
      case 'training-detail':
        router.replace(`/trainings/${assignmentId}`);
        break;
      case 'start':
        router.replace(`/exam/${assignmentId}/start`);
        break;
    }
  }, [data, postExamModal, assignmentId]);

  useEffect(() => {
    if (!data || activeVideoId) return;
    const next = data.videos.find((v) => !v.completed && v.contentType !== 'pdf');
    setActiveVideoId(next?.id ?? data.videos[0]?.id ?? null);
  }, [data, activeVideoId]);

  const activeVideo = useMemo(
    () => data?.videos.find((v) => v.id === activeVideoId) ?? null,
    [data, activeVideoId],
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: data?.trainingTitle ?? 'Videolar' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Videolar yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : data && data.videos.length === 0 ? (
        <EmptyState icon="play.fill" title="Bu eğitime video eklenmemiş" />
      ) : data && activeVideo && accessToken ? (
        <Body
          assignmentId={assignmentId}
          token={accessToken}
          videos={data.videos}
          activeVideo={activeVideo}
          onSelectVideo={setActiveVideoId}
          onAllCompleted={() => {
            // completeVideo mutation defaults zaten aynı 4 cache'i invalidate ediyor
            // (lib/query/mutation-defaults.ts). Burada tekrar etmek duplicate fetch yaratır.
            setPostExamModal(true);
          }}
          onRequestPostExam={() => setPostExamModal(true)}
        />
      ) : data && activeVideo && !accessToken ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : null}

      <PhaseTransitionModal
        visible={postExamModal}
        overline="SON SINAV BAŞLIYOR"
        title="Son sınava geçiliyor"
        body="Eğitim videolarını tamamladın. Şimdi son sınav açılacak — başladığında süre işlemeye başlar ve cevapların kaydedilir."
        ctaLabel="Sınava başla"
        icon="exclamationmark.triangle.fill"
        tone="warning"
        durationSeconds={60}
        onContinue={() => {
          setPostExamModal(false);
          router.replace(`/exam/${assignmentId}/questions?phase=post`);
        }}
      />
    </SafeAreaView>
  );
}

function Body({
  assignmentId,
  token,
  videos,
  activeVideo,
  onSelectVideo,
  onAllCompleted,
  onRequestPostExam,
}: {
  assignmentId: string;
  token: string | null;
  videos: ExamVideoItem[];
  activeVideo: ExamVideoItem;
  onSelectVideo: (id: string) => void;
  onAllCompleted: () => void;
  onRequestPostExam: () => void;
}) {
  const t = useTheme();
  const completedCount = videos.filter((v) => v.completed && v.contentType !== 'pdf').length;
  const totalRequired = videos.filter((v) => v.contentType !== 'pdf').length;
  const progressPct = totalRequired === 0 ? 0 : Math.round((completedCount / totalRequired) * 100);

  const isPdf = activeVideo.contentType === 'pdf';

  return (
    <View style={{ flex: 1 }}>
      {!isPdf ? (
        <VideoBlock
          key={`${activeVideo.id}:${token ?? 'public'}`}
          assignmentId={assignmentId}
          token={token}
          video={activeVideo}
          onCompleted={(allDone) => {
            if (allDone) onAllCompleted();
          }}
        />
      ) : (
        <PdfBlock token={token} video={activeVideo} />
      )}

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <VideoListItem
            item={item}
            index={index}
            isActive={item.id === activeVideo.id}
            onPress={() => onSelectVideo(item.id)}
            t={t}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        windowSize={10}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <>
            <Stack
              direction="row"
              justify="space-between"
              align="center"
              style={{ marginBottom: 8, marginTop: 4 }}
            >
              <Text variant="overline" tone="tertiary">
                İLERLEME
              </Text>
              <Text
                variant="caption"
                tone="primary"
                style={{ fontVariant: ['tabular-nums'], fontFamily: 'InterTight_600SemiBold' }}
              >
                {completedCount}/{totalRequired} video
              </Text>
            </Stack>
            <ProgressBar value={progressPct} height={8} />
            <Text variant="title-3" style={{ marginTop: 24, marginBottom: 12 }}>
              Tüm videolar
            </Text>
          </>
        }
        ListFooterComponent={
          totalRequired > 0 && completedCount >= totalRequired ? (
            <View style={{ marginTop: 24 }}>
              <Button
                label="Son sınava geç"
                variant="primary"
                size="lg"
                onPress={onRequestPostExam}
                fullWidth
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function PdfBlock({ token, video }: { token: string | null; video: ExamVideoItem }) {
  const t = useTheme();
  const sourceUrl = video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`;
  const source = token
    ? { uri: sourceUrl, headers: { Authorization: `Bearer ${token}` } }
    : { uri: sourceUrl };

  return (
    <View
      style={{
        height: 340,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        overflow: 'hidden',
        margin: 16,
      }}
    >
      <Stack
        direction="row"
        align="center"
        gap={3}
        style={{
          padding: 12,
          borderBottomWidth: t.hairline,
          borderBottomColor: t.colors.border.subtle,
        }}
      >
        <Text variant="bodyEmph" style={{ flex: 1 }} numberOfLines={1}>
          {video.title}
        </Text>
        <Tag label="PDF" tone="warning" outlined />
      </Stack>
      <WebView
        source={source}
        style={{ flex: 1, backgroundColor: t.colors.surface.primary }}
        startInLoadingState
        renderLoading={() => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color={t.colors.accent.clay} />
          </View>
        )}
      />
    </View>
  );
}

function VideoBlock({
  assignmentId,
  token,
  video,
  onCompleted,
}: {
  assignmentId: string;
  token: string | null;
  video: ExamVideoItem;
  onCompleted: (allDone: boolean) => void;
}) {
  const t = useTheme();
  const sourceUrl = video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`;

  const source = useMemo(
    () => (token ? { uri: sourceUrl, headers: { Authorization: `Bearer ${token}` } } : sourceUrl),
    [sourceUrl, token],
  );

  const player = useVideoPlayer(source, (p) => {
    // 1 sn: özel kontrol çubuğundaki ilerleme göstergesi timeUpdate event'inden beslenir.
    p.timeUpdateEventInterval = 1;
    // Resume seek: kullanıcının daha önce ULAŞTIĞI konuma dönmek ileri sarma sayılmaz.
    if (video.lastPosition && video.lastPosition < video.duration - 5) {
      p.currentTime = video.lastPosition;
    }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  const lastSavedRef = useRef(0);
  // Kayıtlı mutation (MUTATION_KEYS.saveVideoProgress): çıkış/background flush'ı
  // offline'dayken paused kuyruğa girer ve online dönünce replay edilir — app kill
  // olsa bile son pozisyon kaybolmaz.
  const heartbeatMutation = useMutation<VideoProgressResponse, Error, SaveVideoProgressVars>({
    mutationKey: MUTATION_KEYS.saveVideoProgress,
    onError: (err) => {
      // Heartbeat sessiz fail eder — kullanıcıya alert atma. Production'da bu
      // log aggregator'a gider; pek çok heartbeat fail olursa investigate.
      console.warn('[videos] heartbeat save failed', err);
    },
  });
  const heartbeatMutationRef = useRef(heartbeatMutation);
  useEffect(() => {
    heartbeatMutationRef.current = heartbeatMutation;
  });

  // Accumulator: yalnızca play state'inde geçen gerçek wall-clock süresinin
  // toplamı. GERÇEKTE İZLENEN süreden (watchedSeconds) başla — oynatma KONUMUNDAN
  // (lastPosition) DEĞİL; aksi halde kullanıcı ileri sarıp çıkıp dönünce izlemediği
  // süreyi kredi alır (skip-to-end exploit). pause/scrub bu sayacı ARTIRMAZ.
  // Backend ANTI_CHEAT_WATCH_FLOOR=0.9 (%90) + watch rate denetimi yapıyor.
  const accumulatedRef = useRef<number>(video.watchedSeconds ?? 0);
  const lastTickRef = useRef<number | null>(null);
  // Son bilinen oynatma konumu — flush sırasında player release edilmiş
  // olabilir (unmount cleanup sırası), o durumda bu ref kullanılır.
  const lastKnownPositionRef = useRef<number>(Math.floor(video.lastPosition ?? 0));

  useEffect(() => {
    const interval = setInterval(() => {
      if (!player.playing) {
        lastTickRef.current = null;
        return;
      }
      const now = Date.now();
      if (lastTickRef.current !== null) {
        const wallDelta = (now - lastTickRef.current) / 1000;
        // playbackRate: 1.5x oynatımda 1sn wall-clock = 1.5sn izleme.
        accumulatedRef.current = Math.min(
          accumulatedRef.current + wallDelta * (player.playbackRate ?? 1),
          video.duration,
        );
      }
      lastTickRef.current = now;
      lastKnownPositionRef.current = Math.floor(player.currentTime);
      const watched = Math.floor(accumulatedRef.current);
      // Periyodik heartbeat offline'da ATILMAZ (kuyruğa da girmez): izleme sürerken
      // her 10sn'de bir paused mutation birikir, online dönüşte replay fırtınası
      // 60/dk rate limit'e çarpar. Offline ilerlemeyi çıkış flush'ı tek kayıtla taşır.
      if (watched - lastSavedRef.current >= 10 && onlineManager.isOnline()) {
        lastSavedRef.current = watched;
        heartbeatMutationRef.current.mutate({
          assignmentId,
          videoId: video.id,
          position: lastKnownPositionRef.current,
          watchedTime: watched,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [player, assignmentId, video.id, video.duration]);

  const completedRef = useRef(video.completed);
  useEffect(() => {
    completedRef.current = video.completed;
  }, [video.completed]);

  // Çıkış / arka plan flush'ı (web sendBeacon karşılığı): normal heartbeat 10sn
  // birikim eşiğini bekler; kullanıcı ekrandan ayrılır veya app background'a
  // geçerse aradaki izleme + son pozisyon kaybolmasın diye eşiksiz kayıt atılır.
  const flushProgress = useCallback(() => {
    if (
      !shouldFlushHeartbeat({
        accumulated: accumulatedRef.current,
        lastSaved: lastSavedRef.current,
        alreadyCompleted: completedRef.current,
      })
    ) {
      return;
    }
    let position = lastKnownPositionRef.current;
    try {
      position = Math.floor(player.currentTime);
    } catch {
      // Player release edilmiş (unmount) — interval'de güncellenen ref'e düş.
    }
    const watched = Math.floor(accumulatedRef.current);
    lastSavedRef.current = watched;
    // Flush offline'da da mutate edilir: kayıtlı mutation paused kuyruğa girer,
    // online dönünce (app kill sonrası bile) replay olur.
    heartbeatMutationRef.current.mutate({
      assignmentId,
      videoId: video.id,
      position,
      watchedTime: watched,
    });
  }, [player, assignmentId, video.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') flushProgress();
    });
    return () => {
      sub.remove();
      // Unmount: video değişimi veya ekrandan çıkış — son ilerlemeyi yaz.
      flushProgress();
    };
  }, [flushProgress]);

  const completeMutation = useMutation<VideoProgressResponse, Error, CompleteVideoVars>({
    mutationKey: MUTATION_KEYS.completeVideo,
  });
  const completeMutationRef = useRef(completeMutation);
  useEffect(() => {
    completeMutationRef.current = completeMutation;
  });

  // video değişiminde accumulator sıfırla. (VideoBlock zaten key={`${id}:${token}`}
  // ile remount oluyor ama defensive — token değişip videoId aynı kalırsa korunmalı.)
  const lastVideoIdRef = useRef(video.id);
  useEffect(() => {
    if (lastVideoIdRef.current !== video.id) {
      // accumulator gerçek izleme süresinden başlar (lastPosition değil) — resume
      // exploit'ini önler; üstteki useRef init ile tutarlı.
      accumulatedRef.current = video.watchedSeconds ?? 0;
      lastTickRef.current = null;
      lastSavedRef.current = 0;
      completedRef.current = video.completed;
      lastVideoIdRef.current = video.id;
    }
  }, [video.id, video.watchedSeconds, video.completed]);

  // Tamamlama koşulu backend ile bire bir: `completed:true` ANCAK
  // watchedTime >= durationSeconds * 0.9 (ANTI_CHEAT_WATCH_FLOOR, videos/route.ts) ise kabul edilir.
  // Eşik DB duration'ı (video.duration) üzerinden hesaplanır — player.duration metadata'sı
  // backend'in karşılaştırdığı değerden sapabilir, sapma sessiz redde yol açar.
  // İleri sarıp sona gelmek tetiklemez: accumulator şartı her tetikleyicide aranır.
  const tryComplete = useCallback(() => {
    const accumulated = accumulatedRef.current;
    if (
      !shouldCompleteVideo({
        accumulated,
        durationSeconds: video.duration,
        alreadyCompleted: completedRef.current,
        isPending: completeMutationRef.current.isPending,
      })
    ) {
      return;
    }
    completeMutationRef.current.mutate(
      {
        assignmentId,
        videoId: video.id,
        position: Math.floor(player.currentTime),
        watchedTime: buildCompletionWatchedTime(accumulated, video.duration),
      },
      {
        onSuccess: (data) => {
          completedRef.current = true;
          onCompleted(data.allVideosCompleted);
        },
        onError: (err) => {
          // Tamamlama backend'e yazılamadı — kullanıcı yeniden açmazsa
          // bir sonraki açılışta video baştan oynar. Görünür hata göster.
          Alert.alert(
            'Tamamlama kaydedilemedi',
            err.message || 'Bağlantını kontrol edip videoyu yeniden oynatmayı dene.',
          );
        },
      },
    );
  }, [player, assignmentId, video.id, video.duration, onCompleted]);

  // Doğal bitiş — web'in <video> onEnded sinyalinin RN karşılığı (kanonik tetikleyici).
  useEventListener(player, 'playToEnd', tryComplete);

  // Güvence tetikleyicisi: kullanıcı %90+ izleyip videoyu sonuna kadar oynatmadan
  // ayrılırsa da tamamlama kaçmasın.
  useEffect(() => {
    const id = setInterval(tryComplete, 2000);
    return () => clearInterval(id);
  }, [tryComplete]);

  // ── Özel oynatıcı kontrolleri ─────────────────────────────────────────
  // Native kontroller (nativeControls) BİLEREK kapalı: kaydırma çubuğu, 10sn İLERİ
  // sarma, AirPlay ve fullscreen butonları ileri sarmaya izin veriyordu — personelin
  // videoyu gerçekten izlemesi zorunlu (anti-cheat, Ekrem'in ürün kuralı 2026-06-02).
  // Geri sarma + duraklat/devam serbest; ileri sarma UI'da fiziksel olarak imkânsız.

  const togglePlay = () => {
    if (player.playing) player.pause();
    else player.play();
  };

  const seekBackward = () => {
    // clampSeekTarget ileri sarmayı engeller (invariant tek noktada).
    player.currentTime = clampSeekTarget(player.currentTime, player.currentTime - 10);
  };

  const toggleMute = () => {
    const next = !player.muted;
    player.muted = next;
    player.volume = next ? 0 : 1;
  };

  return (
    <View
      style={{
        backgroundColor: '#000',
        borderRadius: t.radius.lg,
        overflow: 'hidden',
        margin: 16,
        marginBottom: 16,
      }}
    >
      <VideoView
        style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}
        player={player}
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        contentFit="contain"
      />

      {/* Kontrol çubuğu: oynat/duraklat · 10sn geri · ilerleme · ses */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: t.colors.surface.secondary,
        }}
      >
        <ControlButton
          icon={isPlaying ? 'pause.fill' : 'play.fill'}
          label={isPlaying ? 'Duraklat' : 'Oynat'}
          onPress={togglePlay}
          primary
          t={t}
        />
        <ControlButton
          icon="gobackward.10"
          label="10 saniye geri sar"
          onPress={seekBackward}
          t={t}
        />
        <PlaybackProgress player={player} durationSeconds={video.duration} t={t} />
        <ControlButton
          icon={muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
          label={muted ? 'Sesi aç' : 'Sesi kapat'}
          onPress={toggleMute}
          t={t}
        />
      </View>

      {/* Başlık satırı */}
      <Stack
        direction="row"
        align="center"
        gap={3}
        style={{
          padding: 14,
          paddingTop: 10,
          backgroundColor: t.colors.surface.secondary,
          borderTopWidth: t.hairline,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyEmph" numberOfLines={2}>
            {video.title}
          </Text>
          <Stack direction="row" align="center" gap={2} style={{ marginTop: 4 }}>
            <IconSymbol
              name={isPlaying ? 'play.fill' : 'pause.fill'}
              size={12}
              color={t.colors.text.tertiary}
            />
            <Text variant="caption" tone="tertiary">
              {isPlaying ? 'Oynatılıyor' : 'Duraklatıldı'} · {formatDuration(video.duration)}
            </Text>
          </Stack>
        </View>
      </Stack>
    </View>
  );
}

/** Kontrol çubuğu butonu — 44pt dokunma hedefi; birincil (oynat) clay, diğerleri nötr. */
function ControlButton({
  icon,
  label,
  onPress,
  primary,
  t,
}: {
  icon: ComponentProps<typeof IconSymbol>['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: primary ? t.colors.accent.clay : t.colors.surface.primary,
        borderWidth: primary ? 0 : t.hairline,
        borderColor: t.colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconSymbol
        name={icon}
        size={20}
        color={primary ? t.colors.accent.clayOnAccent : t.colors.text.primary}
      />
    </Pressable>
  );
}

/**
 * İlerleme göstergesi — SADECE görsel, dokunulamaz (ileri sarma engeli kuralının
 * parçası). Kendi component'inde izole: 1Hz timeUpdate re-render'ı player'ı ve
 * kontrol butonlarını yeniden çizdirmesin.
 */
function PlaybackProgress({
  player,
  durationSeconds,
  t,
}: {
  player: VideoPlayer;
  durationSeconds: number;
  t: ReturnType<typeof useTheme>;
}) {
  const timeUpdate = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const current = Math.min(Math.floor(timeUpdate?.currentTime ?? 0), durationSeconds);
  const pct = durationSeconds > 0 ? Math.min((current / durationSeconds) * 100, 100) : 0;
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <ProgressBar value={pct} height={4} />
      <Text
        variant="caption"
        tone="tertiary"
        maxFontSizeMultiplier={1.6}
        style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
      >
        {formatDuration(current)} / {formatDuration(durationSeconds)}
      </Text>
    </View>
  );
}

const VideoListItem = memo(function VideoListItem({
  item,
  index,
  isActive,
  onPress,
  t,
}: {
  item: ExamVideoItem;
  index: number;
  isActive: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.md,
        padding: 12,
        marginBottom: 8,
        borderWidth: isActive ? 2 : t.hairline,
        borderColor: isActive ? t.colors.accent.clay : t.colors.border.subtle,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <IconDot
        variant={item.completed ? 'success' : 'neutral'}
        size={28}
        numeral={item.completed ? undefined : index + 1}
      />
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmph" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {formatDuration(item.duration)}
          {item.contentType === 'pdf' ? ' · PDF' : ''}
        </Text>
      </View>
      {isActive ? <Tag label="Şu an" tone="primary" /> : null}
    </Pressable>
  );
});

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
