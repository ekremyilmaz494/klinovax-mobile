import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PhaseTransitionModal } from '@/components/exam/PhaseTransitionModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, IconDot, Stack, Tag, Text, useTheme } from '@/design-system';
import { fetchExamVideos, saveVideoProgress } from '@/lib/api/exam';
import { API_BASE_URL } from '@/lib/config';
import type { CompleteVideoVars } from '@/lib/query/mutation-defaults';
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
    p.timeUpdateEventInterval = 5;
    if (video.lastPosition && video.lastPosition < video.duration - 5) {
      p.currentTime = video.lastPosition;
    }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  const lastSavedRef = useRef(0);
  const heartbeatMutation = useMutation({
    mutationFn: (body: {
      videoId: string;
      position: number;
      watchedTime: number;
      completed?: boolean;
    }) => saveVideoProgress(assignmentId, body),
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
  // toplamı. lastPosition'dan başla; pause/scrub bu sayacı ARTIRMAZ.
  // Backend 80% kuralı + watch rate denetimi yapıyor; mobile'ın
  // currentTime'ı doğrudan göndermesi skip-to-end exploit'ine yol açıyordu.
  const accumulatedRef = useRef<number>(video.lastPosition ?? 0);
  const lastTickRef = useRef<number | null>(null);

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
      const watched = Math.floor(accumulatedRef.current);
      if (watched - lastSavedRef.current >= 10) {
        lastSavedRef.current = watched;
        heartbeatMutationRef.current.mutate({
          videoId: video.id,
          position: Math.floor(player.currentTime),
          watchedTime: watched,
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [player, video.id, video.duration]);

  const completedRef = useRef(video.completed);
  useEffect(() => {
    completedRef.current = video.completed;
  }, [video.completed]);

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
      accumulatedRef.current = video.lastPosition ?? 0;
      lastTickRef.current = null;
      lastSavedRef.current = 0;
      completedRef.current = video.completed;
      lastVideoIdRef.current = video.id;
    }
  }, [video.id, video.lastPosition, video.completed]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!player.duration) return;
      const accumulated = accumulatedRef.current;
      // Backend 80% eşiğini uyguluyor; mobile da aynı eşikte completion'ı tetikler.
      // Sadece currentTime >= duration-1 yetmez — kullanıcı ileri sarıp sona
      // gelmiş olabilir (accumulator hâlâ düşük) → completion mutation tetiklenirse
      // backend 80% altında kaldığı için reject (allVideosCompleted: false) döner,
      // sonsuz tetikleme döngüsü doğar. accumulator >= 80% güvenli sinyal.
      if (
        !completedRef.current &&
        !completeMutationRef.current.isPending &&
        accumulated >= player.duration * 0.8
      ) {
        completeMutationRef.current.mutate(
          {
            assignmentId,
            videoId: video.id,
            position: Math.floor(player.currentTime),
            watchedTime: Math.floor(accumulated),
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
      }
    }, 2000);
    return () => clearInterval(id);
  }, [player, assignmentId, video.id, onCompleted]);

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
        nativeControls
        allowsFullscreen
        allowsPictureInPicture={false}
        contentFit="contain"
      />
      <Stack
        direction="row"
        align="center"
        gap={3}
        style={{
          padding: 14,
          backgroundColor: t.colors.surface.secondary,
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
        <Pressable
          onPress={() => {
            const next = !player.muted;
            player.muted = next;
            player.volume = next ? 0 : 1;
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.colors.surface.primary,
            borderWidth: t.hairline,
            borderColor: t.colors.border.subtle,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Sesi aç' : 'Sesi kapat'}
        >
          <IconSymbol
            name={muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            size={20}
            color={t.colors.text.primary}
          />
        </Pressable>
      </Stack>
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
