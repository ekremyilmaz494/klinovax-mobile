import { useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { createScormAttempt, fetchScormAttempt, patchScormAttempt } from '@/lib/api/scorm';
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

  // ── PATCH flush (debounce + commit/finish + unmount/background) ──
  const flushPatch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const data = pendingPatch.current;
    if (Object.keys(data).length === 0) return;
    pendingPatch.current = {};
    // Best-effort (web ile aynı): tracking PATCH başarısızsa sessizce geç —
    // kullanıcı içeriği oynamaya devam etsin, sonraki commit yeniden dener.
    void patchScormAttempt(trainingId, data).catch(() => {});
  }, [trainingId]);

  const markCompleted = useCallback(() => {
    // Tamamlama backend'de sertifikayı tetikledi (lessonStatus passed/completed PATCH'i);
    // liste/sertifika/dashboard cache'lerini tazele ki dönüşte senkron olsun.
    qc.invalidateQueries({ queryKey: ['my-trainings'] });
    qc.invalidateQueries({ queryKey: ['training-detail', trainingId] });
    qc.invalidateQueries({ queryKey: ['certificates'] });
    qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
    setPhase('completed');
  }, [qc, trainingId]);

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
          flushPatch(); // tamamlama anında yaz (debounce bekleme)
          markCompleted();
        } else {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(flushPatch, 2000);
        }
      } else if (msg.type === 'commit' || msg.type === 'finish') {
        flushPatch();
      }
    },
    [flushPatch, markCompleted],
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
        let attempt: ScormAttempt | null = await fetchScormAttempt(trainingId).catch(() => null);
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
        setErrorMsg(
          err instanceof ApiError && err.message
            ? err.message
            : 'SCORM içerik başlatılamadı. Bağlantını kontrol edip tekrar dene.',
        );
        setPhase('error');
      }
    })();

    return () => {
      signal.cancelled = true;
      flushPatch(); // ekrandan çıkışta bekleyen ilerlemeyi yaz
    };
    // flushPatch trainingId'e bağlı stabil; init yalnız param/token değişince koşmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId, entryPoint, accessToken]);

  // Arka plana geçişte bekleyen ilerlemeyi yaz (web sendBeacon karşılığı).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') flushPatch();
    });
    return () => sub.remove();
  }, [flushPatch]);

  const headerTitle = title || 'SCORM Eğitim';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: headerTitle, headerBackTitle: 'Geri' }} />

      {phase === 'loading' ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
          <Text variant="callout" tone="secondary" style={{ marginTop: 20, marginBottom: 12 }}>
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
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <IconSymbol name="checkmark.circle.fill" size={64} color={t.colors.status.success} />
          <Text variant="title-2" align="center" style={{ marginTop: 16 }}>
            Eğitim tamamlandı
          </Text>
          <Text variant="body" tone="tertiary" align="center" style={{ marginTop: 8 }}>
            “{headerTitle}” içeriğini başarıyla bitirdin. Sertifikan hazırlanıyorsa sertifikalarında
            görünür.
          </Text>
          <View style={{ marginTop: 28, width: '100%', maxWidth: 320 }}>
            <Button
              label="Eğitimlerime dön"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/(tabs)/trainings')}
              fullWidth
            />
          </View>
        </View>
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
