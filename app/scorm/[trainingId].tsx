import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { CelebrationOverlay } from '@/components/ui/CelebrationOverlay';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { createScormAttempt, fetchScormAttempt } from '@/lib/api/scorm';
import type { PatchScormVars } from '@/lib/query/mutation-defaults';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import {
  buildScormApiInjection,
  buildSeedCmi,
  cmiSetValueToPatch,
  isScormCompletionStatus,
  type ScormBridgeMessage,
} from '@/lib/scorm/bridge';
import { downloadScormPackage, type DownloadSignal } from '@/lib/scorm/download';
import { useAuthStore } from '@/store/auth';
import type { ScormAttempt, ScormTrackingPatch } from '@/types/scorm';

type Phase = 'loading' | 'ready' | 'completed' | 'error';

/**
 * Mobil SCORM 1.2 oynatıcısı (indir-ve-oynat). KRİTİK: route param trainingId
 * (backend /scorm/* route'ları id'yi trainingId olarak kullanır). Akış:
 *   1) Attempt çöz (GET resume → yoksa POST oluştur).
 *   2) Paketi cihaza indir (authenticated content route → Paths.cache).
 *   3) Entry file://'i WebView'a yükle; window.API enjekte et (resume seed'li).
 *   4) SetValue/Commit/Finish → debounce'lu PATCH; passed/completed → sertifika (backend) + tamamlandı UI.
 */
export default function ScormScreen() {
  const t = useTheme();
  const { trainingId, title, entryPoint } = useLocalSearchParams<{
    trainingId: string;
    title?: string;
    entryPoint?: string;
  }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [entryUri, setEntryUri] = useState<string | null>(null);
  const [baseDirUri, setBaseDirUri] = useState<string | null>(null);
  const [injection, setInjection] = useState<string | null>(null);

  const pendingPatch = useRef<ScormTrackingPatch>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef<DownloadSignal>({ cancelled: false });
  // Tamamlama: status 'set' geldiğinde WebView'i HEMEN unmount etmek, SCO'nun ardıl
  // SetValue(score)/session_time/Commit/Finish mesajlarını kaybettiriyordu. UI geçişini
  // finish/commit'e (ya da grace timeout'a) ertele; bu ref'ler o durumu izler.
  const completionSeenRef = useRef(false);
  const completedUiRef = useRef(false);
  const completionGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SCORM tracking PATCH offline-resume registry üzerinden. Online'da anında fire
  // (bugünkü davranış); offline iken paused yazılır, online dönünce replay olur.
  // KRİTİK: tamamlama PATCH'i (lessonStatus passed/completed) backend'de sertifikayı
  // üretir — eskiden best-effort olduğu için offline/kill'de kaybolup sertifika
  // oluşmayabiliyordu. `mutate` referansı stabil → flushPatch identity'si sabit kalır.
  const { mutate: mutateScormPatch } = useMutation<ScormAttempt, Error, PatchScormVars>({
    mutationKey: MUTATION_KEYS.patchScorm,
  });

  // ── PATCH flush (debounce + commit/finish + unmount/background) ──
  const flushPatch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const data = pendingPatch.current;
    if (Object.keys(data).length === 0) return;
    pendingPatch.current = {};
    // Hata yönetimi registry default'unda: isAlreadyProcessedError yutulur, 5xx/ağ
    // retry edilir, offline iken paused+persist → online replay. (Web best-effort'tan iyi.)
    mutateScormPatch({ trainingId, patch: data });
  }, [trainingId, mutateScormPatch]);

  const markCompleted = useCallback(() => {
    // Tamamlama backend'de sertifikayı tetikledi (lessonStatus passed/completed PATCH'i);
    // liste/sertifika/dashboard cache'lerini tazele ki dönüşte senkron olsun.
    qc.invalidateQueries({ queryKey: ['my-trainings'] });
    qc.invalidateQueries({ queryKey: ['training-detail', trainingId] });
    qc.invalidateQueries({ queryKey: ['certificates'] });
    qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
    setPhase('completed');
  }, [qc, trainingId]);

  // Tamamlama UI geçişi (WebView unmount). Status 'set' anında DEĞİL, ardıl
  // score/session_time/Commit/Finish yakalandıktan sonra (finish/commit ya da grace
  // timeout) çağrılır — böylece final skor PATCH'i kaybolmaz.
  const finishCompletion = useCallback(() => {
    if (completedUiRef.current) return;
    completedUiRef.current = true;
    if (completionGraceRef.current) {
      clearTimeout(completionGraceRef.current);
      completionGraceRef.current = null;
    }
    flushPatch();
    markCompleted();
  }, [flushPatch, markCompleted]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: ScormBridgeMessage;
      try {
        msg = JSON.parse(event.nativeEvent.data) as ScormBridgeMessage;
      } catch {
        return;
      }
      if (msg.type === 'set') {
        Object.assign(pendingPatch.current, cmiSetValueToPatch(msg.key, msg.value));
        if (msg.key === 'cmi.core.lesson_status' && isScormCompletionStatus(msg.value)) {
          completionSeenRef.current = true;
          flushPatch(); // tamamlama PATCH'i hemen yaz (sertifika) — ama WebView'i unmount ETME
          // UI geçişini ertele: ardıl SetValue(score)/Commit/Finish gelene kadar bekle.
          if (completionGraceRef.current) clearTimeout(completionGraceRef.current);
          completionGraceRef.current = setTimeout(finishCompletion, 1500);
        } else {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(flushPatch, 2000);
        }
      } else if (msg.type === 'commit' || msg.type === 'finish') {
        flushPatch();
        // Tamamlama görüldüyse final değerler (score/time) artık geldi → şimdi tamamla.
        if (completionSeenRef.current) finishCompletion();
      }
    },
    [flushPatch, finishCompletion],
  );

  // ── Init: attempt çöz + paketi indir ──
  useEffect(() => {
    const signal: DownloadSignal = { cancelled: false };
    cancelRef.current = signal;

    void (async () => {
      if (!accessToken) {
        setErrorMsg('Oturumun bulunamadı. Tekrar giriş yapman gerekebilir.');
        setPermanent(true);
        setPhase('error');
        return;
      }
      if (!entryPoint) {
        setErrorMsg('Bu eğitim için SCORM içerik bulunamadı.');
        setPermanent(true);
        setPhase('error');
        return;
      }
      try {
        // Resume: var olan attempt'i al; yoksa oluştur.
        // fetchScormAttempt attempt YOKSA null (200) döner; geçici hata (network/5xx/429)
        // FIRLATIR. Eskiden .catch(()=>null) TÜM hataları null'a çevirip yeni attempt
        // yaratıyordu → flaky GET'te resume (suspendData/lessonStatus) sessizce siliniyordu.
        // Hatayı yutma: dış catch retry/kalıcı UI gösterir; yalnız gerçek "attempt yok"ta create.
        let attempt = await fetchScormAttempt(trainingId);
        if (!attempt) attempt = await createScormAttempt(trainingId);
        if (signal.cancelled) return;

        const { entryUri: uri, baseDirUri: base } = await downloadScormPackage({
          trainingId,
          entryPoint,
          token: accessToken,
          signal,
          onProgress: (done, total) => setProgress(total ? done / total : 0),
        });
        if (signal.cancelled) return;

        setEntryUri(uri);
        setBaseDirUri(base);
        setInjection(buildScormApiInjection(buildSeedCmi(attempt)));
        // Zaten geçilmiş/tamamlanmışsa doğrudan tamamlandı ekranı (yeniden izlemeye gerek yok).
        setPhase(isScormCompletionStatus(attempt.lessonStatus) ? 'completed' : 'ready');
      } catch (err) {
        if (signal.cancelled) return;
        // 403 (atama yok) / 404 (içerik yok) kalıcı; diğerleri geçici (tekrar dene).
        const is4xx = err instanceof ApiError && (err.status === 403 || err.status === 404);
        setPermanent(is4xx);
        // 429 (rate-limit): geçici ama "tekrar dene" hemen yine 429 olur — Retry-After'a saygı.
        if (err instanceof ApiError && err.status === 429) {
          const wait =
            err.retryAfter && err.retryAfter > 0 ? ` ${err.retryAfter} saniye` : ' kısa bir süre';
          setErrorMsg(`Çok fazla istek gönderildi. Lütfen${wait} sonra tekrar dene.`);
        } else {
          setErrorMsg(
            err instanceof ApiError && err.message
              ? err.message
              : 'SCORM içerik başlatılamadı. Bağlantını kontrol edip tekrar dene.',
          );
        }
        setPhase('error');
      }
    })();

    return () => {
      signal.cancelled = true;
      flushPatch(); // ekrandan çıkışta bekleyen ilerlemeyi yaz
      // Grace timer'ı temizle: ekran kapanırken markCompleted (setState) tetiklenmesin.
      if (completionGraceRef.current) clearTimeout(completionGraceRef.current);
    };
    // flushPatch trainingId'e bağlı stabil; init yalnız param/token değişince koşmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId, entryPoint, accessToken]);

  // Arka plana geçişte bekleyen ilerlemeyi yaz (web sendBeacon karşılığı).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // Yalnız 'background': iOS 'inactive' (Control Center/banner/çağrı) geçici olup
      // foreground'a döner — her seferinde flush gereksiz PATCH churn'ü yaratıyordu.
      if (state === 'background') flushPatch();
    });
    return () => sub.remove();
  }, [flushPatch]);

  const headerTitle = title || 'SCORM Eğitim';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: headerTitle, headerBackTitle: 'Geri' }} />

      {phase === 'loading' ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: t.space[8],
          }}
        >
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
          <Text
            variant="callout"
            tone="secondary"
            style={{ marginTop: t.space[5], marginBottom: t.space[3] }}
          >
            İçerik hazırlanıyor…
          </Text>
          <View style={{ width: '100%', maxWidth: 280 }}>
            <ProgressBar value={Math.round(progress * 100)} height={8} />
          </View>
        </View>
      ) : phase === 'error' ? (
        <ScreenError
          title="SCORM açılamadı"
          message={errorMsg || 'İçerik başlatılamadı.'}
          {...(permanent
            ? {
                action: {
                  label: 'Eğitimlerime dön',
                  onPress: () => router.replace('/(tabs)/trainings'),
                },
              }
            : {
                onRetry: () =>
                  router.replace({
                    pathname: '/scorm/[trainingId]',
                    params: { trainingId, title: headerTitle, entryPoint: entryPoint ?? '' },
                  }),
              })}
        />
      ) : phase === 'completed' ? (
        <>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: t.space[8],
            }}
          >
            <IconSymbol name="checkmark.circle.fill" size={64} color={t.colors.status.success} />
            <Text variant="title-2" align="center" style={{ marginTop: t.space[4] }}>
              Eğitim tamamlandı
            </Text>
            <Text variant="body" tone="tertiary" align="center" style={{ marginTop: t.space[2] }}>
              “{headerTitle}” içeriğini başarıyla bitirdin. Sertifikan hazırlanıyorsa
              sertifikalarında görünür.
            </Text>
            <View style={{ marginTop: t.space[8], width: '100%', maxWidth: 320 }}>
              <Button
                label="Eğitimlerime dön"
                variant="primary"
                size="lg"
                onPress={() => router.replace('/(tabs)/trainings')}
                fullWidth
              />
            </View>
          </View>
          {/* Kutlama yalnız NÖTR tamamlanmada (eğitim bitti). */}
          <CelebrationOverlay />
        </>
      ) : entryUri ? (
        <WebView
          source={{ uri: entryUri }}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={injection ?? undefined}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowsInlineMediaPlayback
          // iOS: paket kök dizinine okuma izni — alt-kaynaklar (js/css/görsel) yüklensin.
          allowingReadAccessToURL={baseDirUri ?? undefined}
          style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}
          startInLoadingState
          renderLoading={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={t.colors.accent.clay} size="large" />
            </View>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}
