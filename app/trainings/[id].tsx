import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { ScreenError } from '@/components/ui/ScreenError';
import {
  Button,
  Card,
  ContentMaxWidth,
  IconDot,
  InputField,
  Stack,
  Tag,
  Text,
  useTheme,
} from '@/design-system';
import { useStartExam } from '@/hooks/use-start-exam';
import { fetchAttemptRequests } from '@/lib/api/attempt-requests';
import { ApiError } from '@/lib/api/client';
import { fetchTrainingDetail } from '@/lib/api/staff';
import { resolveTrainingDetailRoute } from '@/lib/exam/route-guard';
import type { CreateAttemptRequestVars } from '@/lib/query/mutation-defaults';
import { MUTATION_KEYS } from '@/lib/query/mutation-keys';
import { useAuthStore } from '@/store/auth';
import type {
  AssignmentStatus,
  AttemptRequest,
  AttemptRequestsResponse,
  CreateAttemptRequestResponse,
  TrainingDetail,
  TrainingFeedbackState,
  TrainingVideo,
} from '@/types/staff';

const STATUS_TONE: Record<AssignmentStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  assigned: 'info',
  in_progress: 'warning',
  passed: 'success',
  failed: 'danger',
  locked: 'danger',
};
const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Atandı',
  in_progress: 'Devam',
  passed: 'Geçti',
  failed: 'Kaldı',
  locked: 'Kilitli',
};

export default function TrainingDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data, error, isLoading, refetch } = useQuery<TrainingDetail, Error>({
    queryKey: ['training-detail', id],
    enabled: !!user && !!id,
    queryFn: () => fetchTrainingDetail(id),
    // Backend aktif (devam eden) attempt'te `Cache-Control: no-store` döner (N4 fix):
    // bayat `preExamCompleted:false` CTA'yı tekrar "Ön Sınava Başla" yapıyordu. Faz
    // geçişinden (video→detay) dönünce her zaman taze çek — global 30sn staleTime'ı ez.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) void logout();
  }, [error, logout]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Eğitim detayı', headerBackTitle: 'Geri' }} />

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent.clay} size="large" />
        </View>
      ) : error && !data ? (
        <ScreenError
          message={error.message || 'Eğitim detayı yüklenemedi.'}
          onRetry={() => void refetch()}
        />
      ) : data ? (
        <Detail data={data} />
      ) : null}
    </SafeAreaView>
  );
}

function Detail({ data }: { data: TrainingDetail }) {
  const t = useTheme();
  // SCORM eğitimi: normal pre/video/post akışı yerine WebView oynatıcısı. CTA hep
  // oynatıcıya gider; oynatıcı kendi resume/tamamlama durumunu yönetir.
  const action = data.isScorm
    ? {
        label:
          data.status === 'passed' || data.postExamCompleted
            ? 'SCORM eğitimini tekrar aç'
            : 'SCORM eğitimini aç',
        disabled: data.status === 'locked' || data.isNotStarted,
      }
    : resolveAction(data);

  // Retry CTA'sı (`start-direct`) POST /start'ı ekran açmadan yerinde çalıştırır.
  // navigate=push → detay stack'te kalır (videodan geri → detay). Bilinmeyen status'te
  // zaten detaydayız (no-op). Generic hata: detayın inline hata alanı yok, Alert ile bas.
  const startExam = useStartExam(data.assignmentId, {
    navigate: router.push,
    onUnknownStatus: () => {},
    onError: (err) =>
      Alert.alert(
        'Sınav başlatılamadı',
        err instanceof ApiError && err.message
          ? err.message
          : 'Bağlantını kontrol edip tekrar dene.',
      ),
  });

  /**
   * CTA hedefi route guard'dan gelir. Devam eden attempt'te start ekranı atlanıp
   * doğrudan kalınan faza gidilir. `start` (fresh ilk deneme) kurallar ekranına; retry
   * (`start-direct`) ise ekran açmadan POST /start'a gider — ön sınav atlandığından
   * doğrudan videoya yönlenir (web paritesi), zorunlu feedback 423 gate'i korunur.
   */
  const handleCtaPress = () => {
    if (data.isScorm) {
      router.push({
        pathname: '/scorm/[trainingId]',
        params: { trainingId: data.id, title: data.title, entryPoint: data.scormEntryPoint ?? '' },
      });
      return;
    }
    const target = resolveTrainingDetailRoute(data);
    switch (target.kind) {
      case 'start':
        router.push(`/exam/${data.assignmentId}/start`);
        break;
      case 'start-direct':
        startExam.start();
        break;
      case 'questions':
        router.push(`/exam/${data.assignmentId}/questions?phase=${target.phase}`);
        break;
      case 'videos':
        router.push(`/exam/${data.assignmentId}/videos`);
        break;
      case 'result':
        router.push(`/exam/${data.assignmentId}/result`);
        break;
      case 'training-detail':
        // Zaten detaydayız — bu durumlarda CTA disabled, pratikte tetiklenmez.
        break;
    }
  };

  return (
    // keyboardShouldPersistTaps: AttemptRequestSection'daki TextInput açıkken
    // "Ek hak talep et" butonuna ilk dokunuş klavyeyi kapatmakla kalmasın,
    // butonu da bassın (feedback ekranıyla aynı pattern).
    <ScrollView
      contentContainerStyle={{
        padding: t.space[5],
        paddingBottom: t.space[12],
        width: '100%',
        maxWidth: ContentMaxWidth.content,
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      {data.category ? (
        <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
          {data.category}
        </Text>
      ) : null}

      <Stack direction="row" justify="space-between" align="flex-start" gap={3}>
        <Text variant="title-1" style={{ flex: 1 }}>
          {data.title}
        </Text>
        <Badge label={STATUS_LABEL[data.status]} tone={STATUS_TONE[data.status]} />
      </Stack>

      {data.description ? (
        <Text variant="body" tone="secondary" style={{ marginTop: t.space[4], lineHeight: 24 }}>
          {data.description}
        </Text>
      ) : null}

      {data.isNotStarted ? (
        <Card variant="accent" rail style={{ marginTop: t.space[4] }}>
          <Text
            variant="overline"
            style={{ color: t.colors.accent.clay, marginBottom: t.space[1] }}
          >
            HENÜZ AÇILMADI
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim{' '}
            <Text variant="body" weight="semibold">
              {data.startDate ?? '—'}
            </Text>{' '}
            tarihinde açılacak.{data.deadline ? ` Tamamlanma süresi: ${data.deadline}.` : ''}
          </Text>
        </Card>
      ) : null}

      {data.status === 'locked' ? (
        <Card variant="danger" rail style={{ marginTop: t.space[4] }}>
          <Text
            variant="overline"
            style={{ color: t.colors.status.danger, marginBottom: t.space[1] }}
          >
            EĞİTİM KİLİTLENDİ
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim kurum tarafından arşivlendi veya kaldırıldı. Sorularınız için kurum
            yöneticinizle iletişime geçin.
          </Text>
        </Card>
      ) : null}

      {data.isExpired && !data.isExpiredRetryable ? (
        <Card variant="danger" rail style={{ marginTop: t.space[4] }}>
          <Text
            variant="overline"
            style={{ color: t.colors.status.danger, marginBottom: t.space[1] }}
          >
            SÜRE DOLDU
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitimin süresi doldu.
          </Text>
        </Card>
      ) : null}

      {data.isExpiredRetryable ? (
        <Card variant="warning" rail style={{ marginTop: t.space[4] }}>
          <Text
            variant="overline"
            style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
          >
            ÖNCEKİ DENEME SÜRESİ DOLDU
          </Text>
          <Text variant="body" tone="primary">
            Yarım kalan denemenin süresi doldu. İlerlemen{' '}
            <Text variant="body" weight="semibold">
              taşınmaz
            </Text>
            ; yeni bir denemeye baştan başlarsın. Kalan deneme:{' '}
            <Text variant="body" weight="semibold">
              {Math.max(data.maxAttempts - data.currentAttempt, 0)}/{data.maxAttempts}
            </Text>
            .
          </Text>
        </Card>
      ) : null}

      {data.needsRetry && !data.isExpired && !data.isExpiredRetryable ? (
        <Card variant="warning" rail style={{ marginTop: t.space[4] }}>
          <Text
            variant="overline"
            style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
          >
            YENİDEN DENENEBİLİR
          </Text>
          <Text variant="body" tone="primary">
            Son denemede %{data.lastAttemptScore ?? 0} aldınız. Geçme barajı %{data.passingScore}.
            Kalan deneme:{' '}
            <Text variant="body" weight="semibold">
              {Math.max(data.maxAttempts - data.currentAttempt, 0)}/{data.maxAttempts}
            </Text>
            .
          </Text>
        </Card>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: t.space[6],
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.colors.border.subtle,
        }}
      >
        <MetaCell label="Geçme barajı" value={`%${data.passingScore}`} side="left" top />
        <MetaCell
          label="Sınav süresi"
          value={data.examDuration ? `${data.examDuration} dk` : '—'}
          top
        />
        {/* questionCount güncelleme öncesi persisted cache'te yok — 'undefined' yazma. */}
        <MetaCell
          label="Soru sayısı"
          value={data.questionCount != null ? `${data.questionCount}` : '—'}
          side="left"
        />
        <MetaCell label="Deneme" value={`${data.currentAttempt}/${data.maxAttempts}`} />
        <MetaCell label="Son tarih" value={data.deadline || '—'} />
      </View>

      {data.isScorm ? (
        <Card style={{ marginTop: t.space[6] }}>
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[2] }}>
            SCORM İÇERİK
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim etkileşimli bir SCORM paketidir. Aşağıdaki düğmeyle içerik indirilip
            oynatıcıda açılır; ilerlemen otomatik kaydedilir, kaldığın yerden devam edebilirsin.
          </Text>
        </Card>
      ) : (
        <>
          <Text variant="title-3" style={{ marginTop: t.space[8], marginBottom: t.space[3] }}>
            İlerleme
          </Text>
          <View style={{ gap: t.space[3] }}>
            {!data.examOnly && (
              <Step
                n={1}
                label="Ön sınav"
                done={data.preExamCompleted}
                current={resolveCurrentStep(data) === 'pre'}
              />
            )}
            {!data.examOnly && (
              <Step
                n={2}
                label="Videolar"
                done={data.videosCompleted}
                current={resolveCurrentStep(data) === 'videos'}
              />
            )}
            <Step
              n={data.examOnly ? 1 : 3}
              label="Son sınav"
              done={data.postExamCompleted}
              current={resolveCurrentStep(data) === 'post'}
              score={data.lastAttemptScore}
            />
          </View>
        </>
      )}

      {!data.isScorm && data.videos.length > 0 && !data.examOnly ? (
        <>
          <Text variant="title-3" style={{ marginTop: t.space[8], marginBottom: t.space[3] }}>
            Videolar ({data.videos.length})
          </Text>
          <View style={{ gap: t.space[2] }}>
            {data.videos.map((v, i) => (
              <VideoRow key={v.id} index={i + 1} video={v} />
            ))}
          </View>
          {/* Geçmiş eğitim → içeriği serbest sarmayla tekrar izleme (review modu).
              Web personel detayındaki "tekrar izle" girişinin mobil karşılığı. */}
          {data.status === 'passed' || data.postExamCompleted ? (
            <View style={{ marginTop: t.space[3] }}>
              <Button
                label="Eğitim içeriğini tekrar izle"
                variant="outline"
                size="md"
                onPress={() =>
                  router.push({
                    pathname: '/exam/[assignmentId]/videos',
                    params: { assignmentId: data.assignmentId, mode: 'review' },
                  })
                }
                fullWidth
              />
            </View>
          ) : null}
        </>
      ) : null}

      {isExhausted(data) ? <AttemptRequestSection data={data} /> : null}

      {data.feedback?.formActive ? (
        <FeedbackSection feedback={data.feedback} trainingTitle={data.title} />
      ) : null}

      <View style={{ marginTop: t.space[8] }}>
        <Button
          label={action.label}
          variant="primary"
          size="lg"
          loading={startExam.isPending}
          disabled={action.disabled || startExam.isPending}
          onPress={handleCtaPress}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

/**
 * Geri bildirim bölümü (EY.FR.40) — web my-trainings/[id] FeedbackSection paritesi.
 * Org'da aktif form varken (`formActive`) HER ZAMAN render edilir; 3 durum:
 *   (a) submitted    → "Geri bildiriminiz alındı" onayı + gönderim tarihi
 *   (b) canSubmit    → "Geri bildirim ver" CTA (zorunluysa uyarı varyantı)
 *   (c) henüz açık değil → bilgilendirme (sınav tamamlanınca açılır)
 * Zorunlu form doldurulmadan backend yeni eğitim başlatmayı 423 ile kilitler —
 * buradan doldurmak personeli o kilide hiç sokmaz.
 */
function FeedbackSection({
  feedback,
  trainingTitle,
}: {
  feedback: TrainingFeedbackState;
  trainingTitle: string;
}) {
  const t = useTheme();
  // Closure içinde daralma korunsun diye property'yi local const'a al.
  const attemptId = feedback.attemptId;

  return (
    <View style={{ marginTop: t.space[8] }}>
      <Text variant="title-3" style={{ marginBottom: t.space[1] }}>
        Geri bildirim
      </Text>
      <Text variant="footnote" tone="tertiary" style={{ marginBottom: t.space[3] }}>
        Eğitim değerlendirme formu · EY.FR.40
      </Text>

      {feedback.submitted ? (
        // (a) Gönderildi
        <Card variant="success" rail>
          <Text
            variant="overline"
            style={{ color: t.colors.status.success, marginBottom: t.space[1] }}
          >
            GERİ BİLDİRİM ALINDI
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim için değerlendirme formunu tamamladın. Katkın için teşekkürler.
          </Text>
          {feedback.submittedAt ? (
            <Text
              variant="footnote"
              tone="tertiary"
              weight="semibold"
              style={{ marginTop: t.space[2] }}
            >
              Gönderim · {feedback.submittedAt}
            </Text>
          ) : null}
        </Card>
      ) : feedback.canSubmit && attemptId ? (
        // (b) Doldurulabilir
        <Card variant={feedback.mandatory ? 'warning' : 'default'} rail={feedback.mandatory}>
          {feedback.mandatory ? (
            <Text
              variant="overline"
              style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
            >
              ZORUNLU GERİ BİLDİRİM
            </Text>
          ) : null}
          <Text variant="body" tone="primary" style={{ marginBottom: t.space[3] }}>
            {feedback.mandatory
              ? 'Bu eğitim için geri bildirim formu doldurman zorunlu. Doldurmadan yeni bir eğitim başlatamazsın.'
              : 'Bu eğitim hakkında geri bildirim verebilirsin. Görüşlerin eğitim kalitesini artırır.'}
          </Text>
          <Button
            label="Geri bildirim ver"
            variant="primary"
            size="md"
            onPress={() =>
              router.push({
                pathname: '/feedback/[attemptId]',
                params: { attemptId, title: trainingTitle },
              })
            }
            fullWidth
          />
        </Card>
      ) : (
        // (c) Henüz açık değil
        <Card variant="default">
          <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[1] }}>
            GERİ BİLDİRİM
          </Text>
          <Text variant="body" tone="primary">
            Geri bildirim formu, eğitimi tamamlayıp sınavı bitirdikten sonra açılır.
            {feedback.mandatory ? ' Bu eğitim için geri bildirim zorunludur.' : ''}
          </Text>
        </Card>
      )}
    </View>
  );
}

/**
 * Hak bittiğinde (EXHAUSTED) yöneticiden ek deneme hakkı talep etme bölümü.
 * Backend guard: yalnızca currentAttempt >= maxAttempts && status != passed iken
 * kabul eder; bekleyen talep varken yenisi 409 döner.
 */
function AttemptRequestSection({ data }: { data: TrainingDetail }) {
  const t = useTheme();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const { data: requestsData, isLoading } = useQuery<AttemptRequestsResponse, Error>({
    queryKey: ['attempt-requests'],
    queryFn: fetchAttemptRequests,
  });

  // Talepler arasından bu eğitime ait en güncelini bul. data.id = trainingId
  // (assignmentId değil — backend response'unda training kimliği `id` alanında).
  const existing = findLatestRequest(requestsData?.requests, data.id);

  // mutationKey ile offline-resume registry'ye bağlı (mutation-defaults): offline
  // basılırsa paused yazılır, online dönünce replay olur — talep kaybolmaz.
  const submitMutation = useMutation<CreateAttemptRequestResponse, Error, CreateAttemptRequestVars>(
    {
      mutationKey: MUTATION_KEYS.createAttemptRequest,
      onSuccess: () => {
        setReason('');
        void qc.invalidateQueries({ queryKey: ['attempt-requests'] });
        Alert.alert(
          'Talebin alındı',
          'Ek deneme hakkı talebin yöneticine iletildi. Sonuçlandığında bildirim alacaksın.',
        );
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          // Yarış durumu: başka cihazdan/önceki denemeden bekleyen talep var.
          void qc.invalidateQueries({ queryKey: ['attempt-requests'] });
          Alert.alert('Bekleyen talep var', 'Bu eğitim için zaten incelenen bir talebin var.');
          return;
        }
        if (err instanceof ApiError && err.status === 429) {
          Alert.alert('Çok sık denedin', 'Kısa bir süre bekleyip tekrar talep gönderebilirsin.');
          return;
        }
        Alert.alert(
          'Talep gönderilemedi',
          err instanceof ApiError && err.message
            ? err.message
            : 'Bağlantını kontrol edip tekrar dene.',
        );
      },
    },
  );

  const trimmed = reason.trim();
  const reasonTooShort = trimmed.length < 10;

  return (
    <View style={{ marginTop: t.space[8] }}>
      <Text variant="title-3" style={{ marginBottom: t.space[3] }}>
        Ek deneme hakkı
      </Text>

      {isLoading ? (
        <Card>
          <ActivityIndicator color={t.colors.accent.clay} />
        </Card>
      ) : existing?.status === 'pending' ? (
        <Card variant="warning" rail>
          <Text
            variant="overline"
            style={{ color: t.colors.status.warning, marginBottom: t.space[1] }}
          >
            TALEBİN İNCELENİYOR
          </Text>
          <Text variant="body" tone="primary">
            Ek deneme hakkı talebin yönetici onayı bekliyor. Sonuçlandığında bildirim alacaksın.
          </Text>
          {existing.reason ? (
            <Text variant="footnote" tone="tertiary" style={{ marginTop: t.space[2] }}>
              Gerekçen: {existing.reason}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          {existing?.status === 'rejected' ? (
            <Card variant="danger" rail style={{ marginBottom: t.space[3] }}>
              <Text
                variant="overline"
                style={{ color: t.colors.status.danger, marginBottom: t.space[1] }}
              >
                ÖNCEKİ TALEBİN REDDEDİLDİ
              </Text>
              <Text variant="body" tone="primary">
                {existing.reviewNote
                  ? `Yönetici notu: ${existing.reviewNote}`
                  : 'Yönetici talebini reddetti. Gerekçeni güncelleyip yeniden talep edebilirsin.'}
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text variant="body" tone="secondary" style={{ marginBottom: t.space[3] }}>
              Deneme hakların bitti. Yöneticinden ek hak talep edebilirsin — kısa bir gerekçe yaz
              (en az 10 karakter).
            </Text>
            <InputField
              surface="canvas"
              value={reason}
              onChangeText={setReason}
              placeholder="Örn. Sınav sırasında bağlantım koptu, yeniden denemek istiyorum."
              multiline
              maxLength={1000}
              editable={!submitMutation.isPending}
            />
            <Stack
              direction="row"
              justify="space-between"
              align="center"
              style={{ marginTop: t.space[2] }}
            >
              <Text variant="caption" tone="tertiary">
                {reasonTooShort ? `En az 10 karakter (${trimmed.length}/10)` : ' '}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
                {trimmed.length}/1000
              </Text>
            </Stack>
            <View style={{ marginTop: t.space[3] }}>
              <Button
                label={submitMutation.isPending ? 'Gönderiliyor…' : 'Ek hak talep et'}
                variant="primary"
                size="md"
                disabled={reasonTooShort || submitMutation.isPending}
                onPress={() =>
                  submitMutation.mutate({ trainingId: data.id, reason: reason.trim() })
                }
                fullWidth
              />
            </View>
          </Card>
        </>
      )}
    </View>
  );
}

/** Aynı eğitim için birden çok talep olabilir (red → yeni talep); en günceli göster. */
function findLatestRequest(
  requests: AttemptRequest[] | undefined,
  trainingId: string,
): AttemptRequest | undefined {
  if (!requests) return undefined;
  return (
    requests
      .filter((r) => r.trainingId === trainingId)
      // Bozuk/eksik createdAt → getTime() NaN → NaN comparator sıralamayı bozardı
      // (yanlış "en güncel" talep). Geçersiz tarihi 0'a düşür.
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))[0]
  );
}

/**
 * EXHAUSTED: hak bitti, geçemedi, expired-retryable da değil. Web'deki
 * my-trainings/[id] durum makinesinin "ek hak talebi formu" koşulu.
 */
function isExhausted(d: TrainingDetail): boolean {
  return d.status === 'failed' && !d.needsRetry && !(d.isExpiredRetryable ?? false);
}

function MetaCell({
  label,
  value,
  side,
  top,
}: {
  label: string;
  value: string;
  side?: 'left' | 'right';
  top?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        width: '50%',
        paddingHorizontal: t.space[4],
        paddingVertical: t.space[4],
        borderTopWidth: top ? 0 : t.hairline,
        borderTopColor: t.colors.border.subtle,
        borderRightWidth: side === 'left' ? t.hairline : 0,
        borderRightColor: t.colors.border.subtle,
      }}
    >
      <Text variant="overline" tone="tertiary" style={{ marginBottom: t.space[1] }}>
        {label}
      </Text>
      <Text variant="bodyEmph" tone="primary">
        {value}
      </Text>
    </View>
  );
}

/**
 * Sıradaki adım: eğitim aktifken (terminal/kilitli/başlamamış değil) tamamlanmamış
 * ilk adım. Kullanıcının nereden devam edeceği step listesinde vurgulanır.
 */
function resolveCurrentStep(d: TrainingDetail): 'pre' | 'videos' | 'post' | null {
  const inactive = d.status === 'passed' || d.status === 'locked' || d.isExpired || d.isNotStarted;
  if (inactive) return null;
  if (d.examOnly) return d.postExamCompleted ? null : 'post';
  if (!d.preExamCompleted) return 'pre';
  if (!d.videosCompleted) return 'videos';
  if (!d.postExamCompleted) return 'post';
  return null;
}

function Step({
  n,
  label,
  done,
  current,
  score,
}: {
  n: number;
  label: string;
  done: boolean;
  /** Sıradaki adım — clay vurgu + "Sıradaki" etiketi. */
  current?: boolean;
  score?: number;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[4],
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: current ? 1.5 : t.hairline,
        borderColor: current ? t.colors.accent.clay : t.colors.border.subtle,
        padding: t.space[4],
      }}
    >
      <IconDot
        variant={done ? 'success' : current ? 'accent' : 'neutral'}
        size={28}
        numeral={done ? undefined : n}
      />
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmph" tone={done ? 'success' : 'primary'}>
          {label}
        </Text>
        {typeof score === 'number' && done ? (
          <Text
            variant="caption"
            tone="tertiary"
            style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}
          >
            %{score}
          </Text>
        ) : null}
      </View>
      {current ? <Tag label="Sıradaki" tone="primary" /> : null}
    </View>
  );
}

function VideoRow({ index, video }: { index: number; video: TrainingVideo }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[3],
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: t.space[3],
      }}
    >
      <IconDot
        variant={video.completed ? 'success' : 'neutral'}
        size={24}
        numeral={video.completed ? undefined : index}
      />
      <View style={{ flex: 1 }}>
        <Text variant="bodyEmph" numberOfLines={2}>
          {video.title}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {video.duration}
        </Text>
      </View>
    </View>
  );
}

/**
 * CTA durum makinesi — web my-trainings/[id]/page.tsx ile aynı öncelik sırası.
 * Sıra önemli: isExpiredRetryable, isExpired'dan ÖNCE kontrol edilmeli (backend'de
 * karşılıklı dışlayıcı ama eski sürüm/edge-case'e karşı savunmacı sıralama).
 */
function resolveAction(d: TrainingDetail): { label: string; disabled: boolean } {
  // locked: eğitim arşivlendi — hiçbir CTA anlamlı değil (web: TRAINING_LOCKED terminal).
  if (d.status === 'locked') return { label: 'Eğitim kilitli', disabled: true };
  if (d.isNotStarted) return { label: 'Henüz açılmadı', disabled: true };
  if (d.isExpiredRetryable) return { label: 'Yeniden başla', disabled: false };
  if (d.isExpired) return { label: 'Süresi doldu', disabled: true };
  if (d.status === 'passed') return { label: 'Tamamlandı', disabled: true };
  if (d.needsRetry) return { label: 'Yeniden dene', disabled: false };
  // Hak bitti: CTA kilitli — ek hak talebi bölümü (AttemptRequestSection) yol gösterir.
  if (isExhausted(d)) return { label: 'Deneme hakkı bitti', disabled: true };
  if (d.examOnly) {
    return { label: d.postExamCompleted ? 'Tekrar başla' : 'Sınava başla', disabled: false };
  }
  if (!d.preExamCompleted) return { label: 'Ön sınava başla', disabled: false };
  if (!d.videosCompleted) return { label: 'Videoları izle', disabled: false };
  if (!d.postExamCompleted) return { label: 'Son sınava başla', disabled: false };
  return { label: 'Devam et', disabled: false };
}
