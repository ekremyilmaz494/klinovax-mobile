import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { onlineManager, useMutation, useQuery } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { PhaseTransitionModal } from '@/components/exam/PhaseTransitionModal';
import { VideoControlsOverlay } from '@/components/video/VideoControlsOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, IconDot, Stack, Tag, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { fetchExamState, fetchExamVideos } from '@/lib/api/exam';
import {
  examStateRedirectTarget,
  resolveAttemptStatusRoute,
  shouldRedirectExamRoute,
  type ExamRouteTarget,
} from '@/lib/exam/route-guard';
import {
  buildCompletionWatchedTime,
  shouldCompleteVideo,
  shouldFlushHeartbeat,
} from '@/lib/exam/video-completion';
import { clampSeekTarget } from '@/lib/exam/video-seek';
import {
  clearVideoProgress,
  mergeWatchedSeconds,
  readVideoProgress,
  writeVideoProgress,
} from '@/lib/exam/video-progress-cache';
import { API_BASE_URL } from '@/lib/config';
import { isAlreadyProcessedError } from '@/lib/query/mutation-defaults';
import type { CompleteVideoVars, SaveVideoProgressVars } from '@/lib/query/mutation-defaults';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import { useAuthStore } from '@/store/auth';
import type { ExamVideoItem, ExamVideosResponse, VideoProgressResponse } from '@/types/exam';

// Bir içerik bitince sonraki içeriğe otomatik geçişten önce gösterilen görünür
// geri sayım (saniye). Web tarafıyla (apps/web .../exam/[id]/videos/page.tsx
// AUTO_ADVANCE_SECONDS) aynı değer — platformlar arası tutarlı deneyim.
const AUTO_ADVANCE_SECONDS = 8;

/**
 * Video aşaması ekranı — eğitim videoları sırayla izlenir, her tamamlanma
 * backend'e POST edilir. Tüm zorunlu (non-pdf) videolar bittiğinde backend
 * `allVideosCompleted: true` döner ve attempt status `post_exam`'a geçer.
 */
export default function VideosScreen() {
  const t = useTheme();
  const { assignmentId, mode } = useLocalSearchParams<{ assignmentId: string; mode?: string }>();
  // İnceleme modu: geçmiş (passed/postExamCompleted) eğitimi serbest sarmayla tekrar izleme.
  // Backend GET /videos?mode=review tüm videoları completed döner, attemptStatus 'review',
  // POST 204 no-op. Tamamlama/ilerleme/anti-cheat kapalı; sıralı kilit yok.
  const isReview = mode === 'review';
  // Zustand auth store'dan oku — refresh sonrası listener tarafından sync ediliyor.
  // SecureStore I/O'su her AppState resume'da yapılmıyor.
  const accessToken = useAuthStore((s) => s.accessToken);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [postExamModal, setPostExamModal] = useState(false);

  const { data, error, isLoading, refetch } = useQuery<ExamVideosResponse, Error>({
    // queryKey'e review/normal segmenti — iki mod farklı sunucu yanıtı döner
    // (review: tüm videolar completed); aynı key'i paylaşırlarsa biri diğerinin
    // durumunu hidrate eder. completeVideo invalidate'i prefix-match olduğundan
    // (['exam-videos', assignmentId]) yine ikisini de tazeler.
    queryKey: ['exam-videos', assignmentId, isReview ? 'review' : 'normal'],
    queryFn: () => fetchExamVideos(assignmentId, { review: isReview }),
    // gcTime:0 + staleTime:0 — KRİTİK: queryKey assignmentId ile denemeler arası
    // AYNI. Persist/in-memory cache ÖNCEKİ denemenin durumunu (attemptStatus
    // 'post_exam' + videolar completed) yeni denemeye taşırsa, aşağıdaki route-guard
    // taze veri gelmeden tetiklenip kullanıcıyı VİDEOYU İZLEMEDEN son sınava atıyordu
    // (2.+ denemede görülen bug). Her mount'ta taze sunucu durumu zorunlu —
    // exam-questions/exam-timer ile aynı desen.
    gcTime: 0,
    staleTime: 0,
  });

  // Route guard: GET /videos yanıtındaki attemptStatus bu ekranla uyuşmuyorsa
  // (örn. tüm videolar bitmiş, attempt post_exam'a geçmiş) kullanıcıyı doğru faza
  // yönlendir. PhaseTransitionModal açıkken devreye girmez — modal aynı geçişi
  // geri sayımla zaten yapıyor; ikisi birden tetiklenirse modal yarıda kesilir.
  const redirectedRef = useRef(false);
  // Hedef route'a git — hem data-bazlı guard hem foreground /state senkronu kullanır.
  const goToExamTarget = useCallback(
    (target: ExamRouteTarget) => {
      switch (target.kind) {
        case 'questions':
          router.replace(`/exam/${assignmentId}/questions?phase=${target.phase}`);
          break;
        case 'result':
          router.replace(`/exam/${assignmentId}/result`);
          break;
        case 'training-detail':
          router.replace(`/trainings/${assignmentId}`);
          break;
        case 'trainings-list':
          router.replace('/(tabs)/trainings');
          break;
        case 'start':
        case 'start-direct':
          router.replace(`/exam/${assignmentId}/start`);
          break;
        case 'videos':
          break; // zaten buradayız
      }
    },
    [assignmentId],
  );

  useEffect(() => {
    // İnceleme modunda ASLA yönlendirme: attemptStatus 'review' →
    // resolveAttemptStatusRoute 'result' döner; bu guard olmadan kullanıcı ekranı
    // göremeden sonuç sayfasına atılır. Review akışını mümkün kılan TEK satır budur.
    if (!data || postExamModal || redirectedRef.current || isReview) return;
    const expected = resolveAttemptStatusRoute(data.attemptStatus);
    if (!shouldRedirectExamRoute({ kind: 'videos' }, expected)) return;
    redirectedRef.current = true;
    goToExamTarget(expected);
  }, [data, postExamModal, isReview, goToExamTarget]);

  // Foreground re-sync: arka plandan dönünce sunucu-otoriteli faz durumunu sor.
  // data-bazlı guard yalnız query refetch'inde tetiklenir; bu effect AppState 'active'te
  // açıkça /exam/state'i çağırır → faz ilerlemiş veya attempt expired ise kullanıcıyı
  // bayat video ekranında bırakmadan doğru faza sıçratır. (questions.tsx'te karşılığı
  // timer foreground refetch'i; orada faz yalnız expiry ile değişebilir, onu timer çözer.)
  const stateSyncingRef = useRef(false);
  useEffect(() => {
    if (isReview) return;
    const sub = AppState.addEventListener('change', (appState) => {
      if (appState !== 'active' || stateSyncingRef.current || redirectedRef.current) return;
      stateSyncingRef.current = true;
      void fetchExamState(assignmentId, 'videos')
        .then((state) => {
          const target = examStateRedirectTarget(state.redirect);
          if (!shouldRedirectExamRoute({ kind: 'videos' }, target)) return;
          redirectedRef.current = true;
          goToExamTarget(target);
        })
        .catch(() => {
          // Ağ/abort — sessiz geç; sonraki foreground veya query tazelemesi yakalar.
        })
        .finally(() => {
          stateSyncingRef.current = false;
        });
    });
    return () => sub.remove();
  }, [assignmentId, isReview, goToExamTarget]);

  useEffect(() => {
    if (!data || activeVideoId) return;
    const next = data.videos.find((v) => !v.completed && v.contentType !== 'pdf');
    setActiveVideoId(next?.id ?? data.videos[0]?.id ?? null);
  }, [data, activeVideoId]);

  const activeVideo = useMemo(
    () => data?.videos.find((v) => v.id === activeVideoId) ?? null,
    [data, activeVideoId],
  );

  // 403 (yetkisiz) / 404 (bulunamadı) KALICI hatadır — tekrar denemek anlamsız,
  // kullanıcıyı listeye geri götür. 401 globalde apiRequest içinde ele alınır
  // (refresh → auth-fail'de logout); buraya kalıcı düşmez. Diğer her şey (5xx,
  // ağ=0, 429) geçici → retry korunur.
  const permanentError =
    error instanceof ApiError && (error.status === 403 || error.status === 404);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: data?.trainingTitle ?? 'Videolar' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        permanentError ? (
          <ScreenError
            title="Eğitime erişilemiyor"
            message="Bu eğitime şu an erişemiyorsun. Eğitim listene dönebilirsin."
            action={{
              label: 'Eğitimlerime dön',
              onPress: () => router.replace('/(tabs)/trainings'),
            }}
          />
        ) : (
          <ScreenError
            message={error.message || 'Videolar yüklenemedi.'}
            onRetry={() => void refetch()}
          />
        )
      ) : data && data.videos.length === 0 ? (
        <EmptyState icon="play.fill" title="Bu eğitime video eklenmemiş" />
      ) : data && activeVideo && accessToken ? (
        <Body
          assignmentId={assignmentId}
          token={accessToken}
          videos={data.videos}
          activeVideo={activeVideo}
          isReview={isReview}
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
  isReview,
  onSelectVideo,
  onAllCompleted,
  onRequestPostExam,
}: {
  assignmentId: string;
  token: string | null;
  videos: ExamVideoItem[];
  activeVideo: ExamVideoItem;
  isReview: boolean;
  onSelectVideo: (id: string) => void;
  onAllCompleted: () => void;
  onRequestPostExam: () => void;
}) {
  const t = useTheme();
  const completedCount = videos.filter((v) => v.completed && v.contentType !== 'pdf').length;
  const totalRequired = videos.filter((v) => v.contentType !== 'pdf').length;
  const progressPct = totalRequired === 0 ? 0 : Math.round((completedCount / totalRequired) * 100);

  // Sıralı izleme kilidi: ilk tamamlanmamış zorunlu (non-pdf) içeriğin liste
  // index'i. Bundan SONRAKİ tamamlanmamış non-pdf içerikler kilitli (web isLocked
  // paritesi). PDF'ler opsiyonel — hiçbir zaman kilitlenmez.
  const firstIncompleteMediaIdx = videos.findIndex((v) => v.contentType !== 'pdf' && !v.completed);

  const isPdf = activeVideo.contentType === 'pdf';

  // Bir içerik bitince sonraki içeriğe geçişten önce gösterilen geri sayım hedefi
  // (null = geri sayım kapalı). Web video→video otomatik geçiş paritesi.
  const [autoAdvanceTarget, setAutoAdvanceTarget] = useState<ExamVideoItem | null>(null);

  // Biten içerik (activeVideo) hariç, sıradaki tamamlanmamış zorunlu (non-pdf)
  // içeriği bulur. completeMutation refetch'i gelmeden çağrılabildiği için biten
  // videoyu açıkça eler. Yoksa undefined (son içerikti).
  const findNextIncomplete = useCallback(
    () =>
      videos.find((v) => v.contentType !== 'pdf' && !v.completed && v.id !== activeVideo.id) ??
      null,
    [videos, activeVideo.id],
  );

  // VideoBlock/PdfBlock tamamlandığında ortak karar: tüm zorunlu içerik bittiyse
  // son sınav modalı; bitmediyse sıradaki içeriğe görünür geri sayımla geçiş.
  const handleCompleted = useCallback(
    (allDone: boolean) => {
      if (allDone) {
        onAllCompleted();
        return;
      }
      const next = findNextIncomplete();
      if (next) setAutoAdvanceTarget(next);
    },
    [onAllCompleted, findNextIncomplete],
  );

  return (
    <View style={{ flex: 1 }}>
      {!activeVideo.url ? (
        // Web Y2 paritesi: backend imzalı URL üretemezse (eksik key / imzalama hatası)
        // `url` boş gelir; boş kaynakla oynatıcı sessizce ölür. Önce açık hata göster.
        <View style={{ margin: t.space[4] }}>
          <EmptyState icon="exclamationmark.triangle.fill" title="İçerik şu anda yüklenemiyor" />
        </View>
      ) : !isPdf ? (
        <VideoBlock
          key={`${activeVideo.id}:${token ?? 'public'}`}
          assignmentId={assignmentId}
          token={token}
          video={activeVideo}
          isReview={isReview}
          onCompleted={handleCompleted}
        />
      ) : (
        <PdfBlock
          assignmentId={assignmentId}
          token={token}
          video={activeVideo}
          isReview={isReview}
          onCompleted={handleCompleted}
        />
      )}

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        // extraData olmadan: VideoListItem memo'lu + data referansı seçimde değişmiyor →
        // FlatList satırları yeniden render etmiyordu, "Şu an"/kilit göstergesi eski
        // satırda kalıyordu. Seçim + kilit girdilerini extraData'ya koy ki satırlar tazelensin.
        extraData={`${activeVideo.id}|${firstIncompleteMediaIdx}|${isReview}`}
        renderItem={({ item, index }) => {
          // İnceleme modunda hiçbir içerik kilitli değil (serbest gezinme). Normal akışta
          // sıralı kilit korunur. (Review yanıtında zaten tümü completed → -1; yine de
          // sunucu veri şekline güvenmeden açıkça kapat.)
          const isLocked =
            !isReview &&
            item.contentType !== 'pdf' &&
            !item.completed &&
            firstIncompleteMediaIdx >= 0 &&
            index > firstIncompleteMediaIdx;
          return (
            <VideoListItem
              item={item}
              index={index}
              isActive={item.id === activeVideo.id}
              isLocked={isLocked}
              onPress={() => {
                if (!isLocked) onSelectVideo(item.id);
              }}
              t={t}
            />
          );
        }}
        contentContainerStyle={{ padding: t.space[4], paddingBottom: t.space[12] }}
        windowSize={10}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <>
            {isReview ? (
              <View style={{ marginBottom: t.space[5], marginTop: t.space[1] }}>
                <Stack direction="row" align="center">
                  <Tag label="İnceleme Modu" tone="primary" />
                </Stack>
                <Text variant="caption" tone="tertiary" style={{ marginTop: t.space[3] }}>
                  Bu eğitimi tamamladın. İçeriği serbestçe ileri-geri sararak tekrar izleyebilirsin;
                  ilerleme kaydedilmez.
                </Text>
              </View>
            ) : (
              <>
                <Stack
                  direction="row"
                  justify="space-between"
                  align="center"
                  style={{ marginBottom: t.space[2], marginTop: t.space[1] }}
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
              </>
            )}
            <Text variant="title-3" style={{ marginTop: t.space[6], marginBottom: t.space[3] }}>
              Tüm videolar
            </Text>
          </>
        }
        ListFooterComponent={
          // İnceleme modunda "Son sınava geç" yok — sınav zaten tamamlandı.
          !isReview && totalRequired > 0 && completedCount >= totalRequired ? (
            <View style={{ marginTop: t.space[6] }}>
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

      {/* Sıradaki içeriğe görünür geri sayımlı otomatik geçiş — mevcut faz-geçiş
          modalı yeniden kullanılır (geri sayım + "Şimdi geç" CTA + sızıntısız timer).
          Süre dolunca VEYA kullanıcı butona basınca onContinue → sonraki içerik. */}
      <PhaseTransitionModal
        visible={!!autoAdvanceTarget}
        overline="SIRADAKİ İÇERİK"
        title={autoAdvanceTarget?.title ?? ''}
        body="Önceki içeriği tamamladın. Sıradaki içeriğe geçiliyor — beklemeden geçmek istersen alttaki butona dokun."
        ctaLabel="Şimdi geç"
        icon="play.fill"
        tone="clay"
        durationSeconds={AUTO_ADVANCE_SECONDS}
        onContinue={() => {
          const nextId = autoAdvanceTarget?.id;
          setAutoAdvanceTarget(null);
          if (nextId) onSelectVideo(nextId);
        }}
      />
    </View>
  );
}

function PdfBlock({
  assignmentId,
  token,
  video,
  isReview,
  onCompleted,
}: {
  assignmentId: string;
  token: string | null;
  video: ExamVideoItem;
  isReview: boolean;
  onCompleted: (allDone: boolean) => void;
}) {
  const t = useTheme();
  // Web paritesi: PdfViewer DAİMA `url` ile beslenir. PdfBlock'a yalnız `url` dolu
  // iken ulaşılır (üstteki `!activeVideo.url` guard'ı boş url'i EmptyState'e düşürür),
  // bu yüzden documentUrl fallback'i hem ölü hem de web sözleşmesinin tersi olurdu.
  // `documentUrl` yalnız audio içeriğin yan-PDF eki içindir ve audio PdfBlock'a gelmez.
  const rawUrl = video.url;
  const sourceUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}${rawUrl}`;
  const source = token
    ? { uri: sourceUrl, headers: { Authorization: `Bearer ${token}` } }
    : { uri: sourceUrl };

  // PDF tamamlama — backend saveVideoProgress({ currentPage, completed:true }) bekler.
  // PDF son sınav gating'inde zorunlu DEĞİL (gating non-pdf'e bakar) ama "okundu"
  // işareti listede/ilerlemede görünür; completeVideo cache invalidation'ı tazeler.
  const completeMutation = useMutation<VideoProgressResponse, Error, CompleteVideoVars>({
    mutationKey: MUTATION_KEYS.completeVideo,
  });

  const markRead = () => {
    if (completeMutation.isPending || video.completed) return;
    const lastPage = video.pageCount ?? 1;
    completeMutation.mutate(
      {
        assignmentId,
        videoId: video.id,
        position: lastPage,
        watchedTime: 0,
        currentPage: lastPage,
      },
      {
        onSuccess: (data) => onCompleted(data.allVideosCompleted),
        onError: (err) => {
          // Idempotent replay/duplicate (409/422) hata değil — sessizce geç.
          if (isAlreadyProcessedError(err)) {
            onCompleted(false);
            return;
          }
          Alert.alert('Kaydedilemedi', err.message || 'Bağlantını kontrol edip tekrar dene.');
        },
      },
    );
  };

  return (
    <View
      style={{
        height: 380,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        overflow: 'hidden',
        margin: t.space[4],
      }}
    >
      <Stack
        direction="row"
        align="center"
        gap={3}
        style={{
          padding: t.space[3],
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
      <View
        style={{
          padding: t.space[3],
          borderTopWidth: t.hairline,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        {isReview ? (
          // İnceleme modu: tamamlama yok — yalnızca görüntüleme. "Tamamlandı" göstergesini
          // de basma (opsiyonel okunmamış PDF'de yanıltıcı olur).
          <Text variant="caption" tone="tertiary" align="center">
            İnceleme modu — dokümanı yalnızca görüntülüyorsun.
          </Text>
        ) : video.completed ? (
          <Stack direction="row" align="center" gap={2}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={t.colors.status.success} />
            <Text variant="caption" tone="tertiary">
              Doküman tamamlandı olarak işaretlendi
            </Text>
          </Stack>
        ) : (
          <Button
            label={completeMutation.isPending ? 'Kaydediliyor…' : 'Okudum, tamamla'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={markRead}
          />
        )}
      </View>
    </View>
  );
}

function VideoBlock({
  assignmentId,
  token,
  video,
  isReview,
  onCompleted,
}: {
  assignmentId: string;
  token: string | null;
  video: ExamVideoItem;
  isReview: boolean;
  onCompleted: (allDone: boolean) => void;
}) {
  const t = useTheme();
  // Ses içerik de expo-video player ile oynatılır (aynı izleme/heartbeat/tamamlama
  // mantığı); yalnız görsel sahne VideoView yerine ses kapağı olur.
  const isAudio = video.contentType === 'audio';
  const sourceUrl = video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`;

  const source = useMemo(
    () => (token ? { uri: sourceUrl, headers: { Authorization: `Bearer ${token}` } } : sourceUrl),
    [sourceUrl, token],
  );

  const player = useVideoPlayer(source, (p) => {
    // 1 sn: özel kontrol çubuğundaki ilerleme göstergesi timeUpdate event'inden beslenir.
    p.timeUpdateEventInterval = 1;
    // Resume seek: kullanıcının daha önce ULAŞTIĞI konuma dönmek ileri sarma sayılmaz.
    // İnceleme modunda resume yok — tekrar izlemede baştan başla (serbest sarma zaten açık).
    if (!isReview && video.lastPosition && video.lastPosition < video.duration - 5) {
      p.currentTime = video.lastPosition;
    }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  // Oynatma hatası (ağ/kaynak) — VideoView aksi halde sessizce siyah kalır. Web'in
  // 'Video yüklenemedi' + Tekrar Dene paritesi için status'ü izle.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

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
  // Yerel önbelleğe en son yazılan izleme süresi (sn) — tekrar yazımları seyreltir.
  const lastCachedRef = useRef(0);

  // Mount'ta yerel önbelleği oku: force-kill / crash sonrası backend'in henüz
  // bilmediği çevrimdışı birikim varsa accumulator'ı ondan başlat (yüksek olanı al).
  //
  // ANTI-CHEAT KORUMASI: önbellek `assignmentId:videoId` ile anahtarlı (attemptId
  // yanıtta yok). Backend bu video için watchedSeconds=0 ve completed=false
  // bildiriyorsa deneme TAZE'dir — olası ÖNCEKİ deneme önbelleğini güvenme, temizle
  // (yeniden denemede eski izleme kredisi sızmasın). Önbellek yalnızca backend zaten
  // bu denemede ilerleme bildirdiğinde (watchedSeconds>0) çevrimdışı fazlalığı kurtarır.
  useEffect(() => {
    // İNCELEME MODU: paylaşılan ilerleme önbelleğine (assignmentId:videoId — her iki
    // mod aynı anahtar) HİÇ DOKUNMA. Burada clear/read yapmak, sürmekte olan başka bir
    // denemenin (örn. yarım kalan retry) çevrimdışı resume verisini silebilir/bozabilir.
    if (isReview) return;
    let cancelled = false;
    void (async () => {
      if ((video.watchedSeconds ?? 0) <= 0 && !video.completed) {
        await clearVideoProgress(assignmentId, video.id);
        return;
      }
      const cached = await readVideoProgress(assignmentId, video.id);
      if (cancelled || !cached) return;
      accumulatedRef.current = mergeWatchedSeconds(accumulatedRef.current, cached.watchedSeconds);
      if (cached.position > lastKnownPositionRef.current) {
        lastKnownPositionRef.current = cached.position;
        // Önbellekteki konuma daha önce ULAŞILMIŞTI (ileri sarma exploit'i değil).
        // Son 5sn'e değme (player init'iyle tutarlı); release edilmişse sessizce geç.
        if (cached.position < video.duration - 5) {
          try {
            player.currentTime = cached.position;
          } catch {
            /* player release edildi */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    assignmentId,
    video.id,
    video.duration,
    video.watchedSeconds,
    video.completed,
    player,
    isReview,
  ]);

  useEffect(() => {
    // İnceleme modu: izleme süresi biriktirme / önbellek yazımı / heartbeat POST yok.
    if (isReview) return;
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
      // Yerel önbelleğe yaz (online/offline fark etmez): uygulama zorla kapansa bile
      // çevrimdışı birikim diskte kalır, reopen'da mount effect'i buradan kurtarır.
      // 5sn eşiği AsyncStorage I/O'sunu seyreltir. Backend'e GİTMEZ — flood yaratmaz.
      if (watched - lastCachedRef.current >= 5) {
        lastCachedRef.current = watched;
        void writeVideoProgress(assignmentId, video.id, {
          watchedSeconds: watched,
          position: lastKnownPositionRef.current,
        });
      }
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
  }, [player, assignmentId, video.id, video.duration, isReview]);

  const completedRef = useRef(video.completed);
  useEffect(() => {
    completedRef.current = video.completed;
  }, [video.completed]);

  // Çıkış / arka plan flush'ı (web sendBeacon karşılığı): normal heartbeat 10sn
  // birikim eşiğini bekler; kullanıcı ekrandan ayrılır veya app background'a
  // geçerse aradaki izleme + son pozisyon kaybolmasın diye eşiksiz kayıt atılır.
  const flushProgress = useCallback(() => {
    // İnceleme modu: çıkış/arka plan flush'ı yok — sunucuya ilerleme yazılmaz.
    if (isReview) return;
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
  }, [player, assignmentId, video.id, isReview]);

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
      lastCachedRef.current = 0;
      completedRef.current = video.completed;
      lastVideoIdRef.current = video.id;
    }
  }, [video.id, video.watchedSeconds, video.completed]);

  // Senkron çift-tetik kilidi: tryComplete hem playToEnd event'inden hem 2sn
  // interval'den çağrılıyor. mutation.isPending React state'i render gecikmeli
  // güncellenir (ref bir effect'te set ediliyor); ikisi aynı tick'te tetiklenirse
  // her ikisi de isPending=false görüp çift POST atabilir. Ref senkron set
  // edildiği için ikinci çağrı anında düşer (questions.tsx submittingRef ile aynı pattern).
  const completionInProgressRef = useRef(false);

  // Tamamlama koşulu backend ile bire bir: `completed:true` ANCAK
  // watchedTime >= durationSeconds * 0.9 (ANTI_CHEAT_WATCH_FLOOR, videos/route.ts) ise kabul edilir.
  // Eşik DB duration'ı (video.duration) üzerinden hesaplanır — player.duration metadata'sı
  // backend'in karşılaştırdığı değerden sapabilir, sapma sessiz redde yol açar.
  // İleri sarıp sona gelmek tetiklemez: accumulator şartı her tetikleyicide aranır.
  const tryComplete = useCallback(
    (reachedEnd: boolean) => {
      // İnceleme modu: tamamlama POST'u YOK (ve önbellek temizliği yok). Sıradaki
      // içeriğe otomatik geçiş de tetiklenmez (onCompleted çağrılmaz).
      if (isReview) return;
      if (completionInProgressRef.current) return;
      const accumulated = accumulatedRef.current;
      if (
        !shouldCompleteVideo({
          accumulated,
          durationSeconds: video.duration,
          alreadyCompleted: completedRef.current,
          isPending: completeMutationRef.current.isPending,
          reachedEnd,
        })
      ) {
        return;
      }
      completionInProgressRef.current = true;
      completeMutationRef.current.mutate(
        {
          assignmentId,
          videoId: video.id,
          position: Math.floor(player.currentTime),
          watchedTime: buildCompletionWatchedTime(accumulated, video.duration),
          // Oynatıcının ölçtüğü gerçek süre — DB duration şişikse (transcode kırpması)
          // backend %90 tabanını min(DB, clientDuration) ile düzeltir. Metadata yoksa DB'ye düş.
          clientDuration: Math.round(player.duration > 0 ? player.duration : video.duration),
        },
        {
          onSuccess: (data) => {
            completedRef.current = true;
            // Tamamlama backend'e yazıldı — yerel önbellek artık gereksiz, temizle.
            void clearVideoProgress(assignmentId, video.id);
            onCompleted(data.allVideosCompleted);
          },
          onError: (err) => {
            // Backend "zaten tamamlanmış" (409/422): paused mutation replay'i ya da
            // flaky network retry'ı. Hata değil — defaults exam-videos cache'ini
            // invalidate etti, sessizce geç (spurious "kaydedilemedi" alert'i atma).
            if (isAlreadyProcessedError(err)) return;
            // Gerçek hata: kullanıcı yeniden açmazsa video baştan oynar — görünür uyar.
            Alert.alert(
              'Tamamlama kaydedilemedi',
              err.message || 'Bağlantını kontrol edip videoyu yeniden oynatmayı dene.',
            );
          },
          onSettled: () => {
            completionInProgressRef.current = false;
          },
        },
      );
    },
    [player, assignmentId, video.id, video.duration, onCompleted, isReview],
  );

  // Doğal bitiş — web'in <video> onEnded sinyalinin RN karşılığı (kanonik tetikleyici).
  // reachedEnd=true: ileri-sarma kapalı olduğu için sona gelmek = video izlendi; kısa
  // videoda 5sn'lik sayaç granülerliği %90 eşiğini kıl payı kaçırsa bile tamamlama
  // buradan kesin gider (aksi halde kullanıcı son sınava geçemeden takılı kalıyordu).
  const completeOnEnd = useCallback(() => tryComplete(true), [tryComplete]);
  useEventListener(player, 'playToEnd', completeOnEnd);

  // Güvence tetikleyicisi: kullanıcı %90+ izleyip videoyu sonuna kadar oynatmadan
  // ayrılırsa da tamamlama kaçmasın (reachedEnd=false → accumulated eşiği aranır).
  useEffect(() => {
    // İnceleme modu: tamamlama güvence tetikleyicisi gereksiz (tryComplete zaten no-op);
    // boş 2sn interval kurma.
    if (isReview) return;
    const id = setInterval(() => tryComplete(false), 2000);
    return () => clearInterval(id);
  }, [tryComplete, isReview]);

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
    // Yalnız muted toggle — volume'a dokunma. Önceden unmute'ta volume=1'e sıçrayıp
    // kullanıcının/sistemin ses seviyesini eziyordu; muted zaten sesi kesip açıyor.
    player.muted = !player.muted;
  };

  // Scrubber/dokunma ile konuma git. NORMAL akış: clampSeekTarget ileri sarmayı
  // no-op'a düşürür (anti-cheat invariant'ı tek noktada; geri konum serbest).
  // İNCELEME modu: serbest konumlanma — ileri-geri sarma açık (sınav zaten bitti).
  const seekTo = (seconds: number) => {
    player.currentTime = isReview ? seconds : clampSeekTarget(player.currentTime, seconds);
  };

  // Yatay tam ekran — expo-screen-orientation ile cihazı döndürür. app.json
  // "portrait" kilitli; iOS'ta lockAsync'in çalışması için expo-screen-orientation
  // plugin'inin AppDelegate kancası şart (app.json plugins'e eklendi). Native
  // fullscreen (VideoView.enterFullscreen) KULLANILMAZ — o native kontrolleri açıp
  // ileri sarma butonunu geri getirir; anti-cheat'i bozar.
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Yönelim kilitlerini SIRALA: enter/exit/unmount lockAsync'leri serileştirilmezse
  // hızlı toggle'da promise'ler ters sırayla resolve olup cihaz yatay kalabiliyordu
  // (app.json portrait kilitliyken bile). Tek promise zinciri → son istenen kilit kazanır.
  const orientationChain = useRef<Promise<unknown>>(Promise.resolve());
  const lockOrientation = useCallback((lock: ScreenOrientation.OrientationLock) => {
    orientationChain.current = orientationChain.current
      .catch(() => {})
      .then(() => ScreenOrientation.lockAsync(lock))
      .catch(() => {});
    return orientationChain.current;
  }, []);

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    void lockOrientation(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, [lockOrientation]);

  const exitFullscreen = useCallback(() => {
    void lockOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP).finally(() =>
      setIsFullscreen(false),
    );
  }, [lockOrientation]);

  // Ekrandan ayrılırken (unmount) yönelimi portrait'e geri al — fullscreen'deyken
  // geri gidilirse uygulama yatay kalmasın. Zincire eklenir → enter'dan sonra gelir.
  useEffect(() => {
    return () => {
      void lockOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [lockOrientation]);

  const stage = (fullscreen: boolean) => (
    <View
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: t.colors.media.background,
        ...(fullscreen ? { flex: 1 } : { aspectRatio: 16 / 9 }),
      }}
    >
      {isAudio ? (
        // Ses içerik — VideoView yerine kapak (siyah video yerine net "sesli içerik"
        // göstergesi). Player aynı; kontroller (oynat/duraklat/sar/ses) VideoControlsOverlay.
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space[4],
            paddingHorizontal: t.space[6],
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.media.surfaceVeil,
            }}
          >
            <IconSymbol name="speaker.wave.2.fill" size={48} color={t.colors.media.control} />
          </View>
          <Text
            variant="bodyEmph"
            style={{ color: t.colors.media.control, textAlign: 'center' }}
            numberOfLines={2}
          >
            {video.title}
          </Text>
          <Text variant="caption" style={{ color: t.colors.media.controlMuted }}>
            Sesli içerik
          </Text>
        </View>
      ) : (
        <VideoView
          style={{ width: '100%', height: '100%', backgroundColor: t.colors.media.background }}
          player={player}
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          contentFit="contain"
        />
      )}
      {status === 'error' ? (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            padding: t.space[6],
            gap: t.space[3],
            backgroundColor: t.colors.media.scrimStrong,
          }}
        >
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={40}
            color={t.colors.media.control}
          />
          <Text variant="bodyEmph" style={{ color: t.colors.media.control, textAlign: 'center' }}>
            Video yüklenemedi
          </Text>
          <Text
            variant="caption"
            style={{ color: t.colors.media.controlMuted, textAlign: 'center' }}
          >
            Bağlantını kontrol edip tekrar dene.
          </Text>
          <Button label="Tekrar Dene" variant="primary" onPress={() => player.replace(source)} />
        </View>
      ) : (
        <VideoControlsOverlay
          player={player}
          durationSeconds={video.duration}
          isPlaying={isPlaying}
          muted={muted}
          isFullscreen={fullscreen}
          onTogglePlay={togglePlay}
          onSeekBackward={seekBackward}
          onToggleMute={toggleMute}
          onSeekTo={seekTo}
          onToggleFullscreen={fullscreen ? exitFullscreen : enterFullscreen}
          hideFullscreen={isAudio}
        />
      )}
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: t.colors.media.background,
        borderRadius: t.radius.lg,
        overflow: 'hidden',
        margin: t.space[4],
        marginBottom: t.space[4],
      }}
    >
      {/* Fullscreen'deyken inline alanı siyah placeholder tutar — player tek yerde
          (modal'da) mount kalsın diye; layout zıplamasın. */}
      {isFullscreen ? (
        <View
          style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: t.colors.media.background }}
        />
      ) : (
        stage(false)
      )}

      {/* Başlık satırı */}
      <Stack
        direction="row"
        align="center"
        gap={3}
        style={{
          padding: t.space[4],
          paddingTop: t.space[3],
          backgroundColor: t.colors.surface.secondary,
          borderTopWidth: t.hairline,
          borderTopColor: t.colors.border.subtle,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyEmph" numberOfLines={2}>
            {video.title}
          </Text>
          <Stack direction="row" align="center" gap={2} style={{ marginTop: t.space[1] }}>
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

      {/* Yatay tam ekran — supportedOrientations iOS modal'ın dönmesine izin verir
          (app portrait kilitliyken bile). Android'de ScreenOrientation.lockAsync döndürür. */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={exitFullscreen}
      >
        <View style={{ flex: 1, backgroundColor: t.colors.media.background }}>
          {isFullscreen ? <StatusBar hidden /> : null}
          {isFullscreen ? stage(true) : null}
        </View>
      </Modal>
    </View>
  );
}

const VideoListItem = memo(function VideoListItem({
  item,
  index,
  isActive,
  isLocked,
  onPress,
  t,
}: {
  item: ExamVideoItem;
  index: number;
  isActive: boolean;
  isLocked: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLocked}
      accessibilityState={{ disabled: isLocked }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[3],
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.md,
        padding: t.space[3],
        marginBottom: t.space[2],
        borderWidth: isActive ? 2 : t.hairline,
        borderColor: isActive ? t.colors.accent.clay : t.colors.border.subtle,
        opacity: isLocked ? 0.55 : pressed ? 0.92 : 1,
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
          {isLocked ? ' · Önceki içerik bitince açılır' : ''}
        </Text>
      </View>
      {isActive ? (
        <Tag label="Şu an" tone="primary" />
      ) : isLocked ? (
        <IconSymbol name="lock.fill" size={14} color={t.colors.text.tertiary} />
      ) : null}
    </Pressable>
  );
});

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
