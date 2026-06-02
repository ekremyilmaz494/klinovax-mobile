import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Card, IconDot, Stack, Tag, Text, useTheme } from '@/design-system';
import { createAttemptRequest, fetchAttemptRequests } from '@/lib/api/attempt-requests';
import { ApiError, apiFetch } from '@/lib/api/client';
import { resolveTrainingDetailRoute } from '@/lib/exam/route-guard';
import { useAuthStore } from '@/store/auth';
import type {
  AssignmentStatus,
  AttemptRequest,
  AttemptRequestsResponse,
  TrainingDetail,
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
    queryFn: () => apiFetch<TrainingDetail>(`/api/staff/my-trainings/${id}`),
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
  const action = resolveAction(data);

  return (
    // keyboardShouldPersistTaps: AttemptRequestSection'daki TextInput açıkken
    // "Ek hak talep et" butonuna ilk dokunuş klavyeyi kapatmakla kalmasın,
    // butonu da bassın (feedback ekranıyla aynı pattern).
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {data.category ? (
        <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
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
        <Text variant="body" tone="secondary" style={{ marginTop: 14, lineHeight: 24 }}>
          {data.description}
        </Text>
      ) : null}

      {data.isNotStarted ? (
        <Card variant="accent" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.accent.clay, marginBottom: 4 }}>
            HENÜZ AÇILMADI
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim{' '}
            <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
              {data.startDate ?? '—'}
            </Text>{' '}
            tarihinde açılacak.{data.deadline ? ` Tamamlanma süresi: ${data.deadline}.` : ''}
          </Text>
        </Card>
      ) : null}

      {data.status === 'locked' ? (
        <Card variant="danger" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.danger, marginBottom: 4 }}>
            EĞİTİM KİLİTLENDİ
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitim kurum tarafından arşivlendi veya kaldırıldı. Sorularınız için kurum
            yöneticinizle iletişime geçin.
          </Text>
        </Card>
      ) : null}

      {data.isExpired && !data.isExpiredRetryable ? (
        <Card variant="danger" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.danger, marginBottom: 4 }}>
            SÜRE DOLDU
          </Text>
          <Text variant="body" tone="primary">
            Bu eğitimin süresi doldu.
          </Text>
        </Card>
      ) : null}

      {data.isExpiredRetryable ? (
        <Card variant="warning" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
            ÖNCEKİ DENEME SÜRESİ DOLDU
          </Text>
          <Text variant="body" tone="primary">
            Yarım kalan denemenin süresi doldu. İlerlemen{' '}
            <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
              taşınmaz
            </Text>
            ; eğitime baştan başlarsın. Kalan deneme:{' '}
            <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
              {Math.max(data.maxAttempts - data.currentAttempt, 0)}/{data.maxAttempts}
            </Text>
            .
          </Text>
        </Card>
      ) : null}

      {data.needsRetry && !data.isExpired && !data.isExpiredRetryable ? (
        <Card variant="warning" rail style={{ marginTop: 16 }}>
          <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
            YENİDEN DENENEBİLİR
          </Text>
          <Text variant="body" tone="primary">
            Son denemede %{data.lastAttemptScore ?? 0} aldınız. Geçme barajı %{data.passingScore}.
            Kalan deneme:{' '}
            <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
              {data.maxAttempts - data.currentAttempt}/{data.maxAttempts}
            </Text>
            .
          </Text>
        </Card>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 24,
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

      <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
        İlerleme
      </Text>
      <View style={{ gap: 10 }}>
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

      {data.videos.length > 0 && !data.examOnly ? (
        <>
          <Text variant="title-3" style={{ marginTop: 28, marginBottom: 12 }}>
            Videolar ({data.videos.length})
          </Text>
          <View style={{ gap: 8 }}>
            {data.videos.map((v, i) => (
              <VideoRow key={v.id} index={i + 1} video={v} />
            ))}
          </View>
        </>
      ) : null}

      {isExhausted(data) ? <AttemptRequestSection data={data} /> : null}

      {data.feedback?.canSubmit && !data.feedback.submitted && data.feedback.attemptId ? (
        <FeedbackPrompt
          attemptId={data.feedback.attemptId}
          trainingTitle={data.title}
          mandatory={data.feedback.mandatory}
        />
      ) : null}

      <View style={{ marginTop: 32 }}>
        <Button
          label={action.label}
          variant="primary"
          size="lg"
          disabled={action.disabled}
          onPress={() => navigateToExamTarget(data)}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

/**
 * CTA hedefi route guard'dan gelir: devam eden attempt'te start ekranı atlanıp
 * doğrudan kalınan faza gidilir (bir dokunuş tasarrufu). Yeni attempt gereken
 * durumlar (fresh/retry/expired-retryable) start'a gider — POST /start orada
 * attempt yaratır ve zorunlu feedback 423 gate'inden geçirir.
 */
function navigateToExamTarget(data: TrainingDetail): void {
  const target = resolveTrainingDetailRoute(data);
  switch (target.kind) {
    case 'start':
      router.push(`/exam/${data.assignmentId}/start`);
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
}

/**
 * Tamamlanan deneme için geri bildirim CTA'sı (EY.FR.40). Zorunlu form
 * doldurulmadan backend yeni eğitim başlatmayı 423 ile kilitler — buradan
 * doldurmak personeli o kilide hiç sokmaz.
 */
function FeedbackPrompt({
  attemptId,
  trainingTitle,
  mandatory,
}: {
  attemptId: string;
  trainingTitle: string;
  mandatory: boolean;
}) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text variant="title-3" style={{ marginBottom: 12 }}>
        Geri bildirim
      </Text>
      <Card variant={mandatory ? 'warning' : 'default'} rail={mandatory}>
        <Text variant="body" tone="primary" style={{ marginBottom: 12 }}>
          {mandatory
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

  const submitMutation = useMutation({
    mutationFn: () => createAttemptRequest({ trainingId: data.id, reason: reason.trim() }),
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
  });

  const trimmed = reason.trim();
  const reasonTooShort = trimmed.length < 10;

  return (
    <View style={{ marginTop: 28 }}>
      <Text variant="title-3" style={{ marginBottom: 12 }}>
        Ek deneme hakkı
      </Text>

      {isLoading ? (
        <Card>
          <ActivityIndicator color={t.colors.accent.clay} />
        </Card>
      ) : existing?.status === 'pending' ? (
        <Card variant="warning" rail>
          <Text variant="overline" style={{ color: t.colors.status.warning, marginBottom: 4 }}>
            TALEBİN İNCELENİYOR
          </Text>
          <Text variant="body" tone="primary">
            Ek deneme hakkı talebin yönetici onayı bekliyor. Sonuçlandığında bildirim alacaksın.
          </Text>
          {existing.reason ? (
            <Text variant="footnote" tone="tertiary" style={{ marginTop: 8 }}>
              Gerekçen: {existing.reason}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          {existing?.status === 'rejected' ? (
            <Card variant="danger" rail style={{ marginBottom: 12 }}>
              <Text variant="overline" style={{ color: t.colors.status.danger, marginBottom: 4 }}>
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
            <Text variant="body" tone="secondary" style={{ marginBottom: 12 }}>
              Deneme hakların bitti. Yöneticinden ek hak talep edebilirsin — kısa bir gerekçe yaz
              (en az 10 karakter).
            </Text>
            <TextInput
              style={{
                backgroundColor: t.colors.surface.canvas,
                borderRadius: t.radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: t.colors.border.default,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 17,
                color: t.colors.text.primary,
                fontFamily: 'InterTight_400Regular',
                minHeight: 96,
                textAlignVertical: 'top',
              }}
              value={reason}
              onChangeText={setReason}
              placeholder="Örn. Sınav sırasında bağlantım koptu, yeniden denemek istiyorum."
              placeholderTextColor={t.colors.text.tertiary}
              multiline
              maxLength={1000}
              editable={!submitMutation.isPending}
            />
            <Stack direction="row" justify="space-between" align="center" style={{ marginTop: 6 }}>
              <Text variant="caption" tone="tertiary">
                {reasonTooShort ? `En az 10 karakter (${trimmed.length}/10)` : ' '}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
                {trimmed.length}/1000
              </Text>
            </Stack>
            <View style={{ marginTop: 12 }}>
              <Button
                label={submitMutation.isPending ? 'Gönderiliyor…' : 'Ek hak talep et'}
                variant="primary"
                size="md"
                disabled={reasonTooShort || submitMutation.isPending}
                onPress={() => submitMutation.mutate()}
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
  return requests
    .filter((r) => r.trainingId === trainingId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
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
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: top ? 0 : t.hairline,
        borderTopColor: t.colors.border.subtle,
        borderRightWidth: side === 'left' ? t.hairline : 0,
        borderRightColor: t.colors.border.subtle,
      }}
    >
      <Text variant="overline" tone="tertiary" style={{ marginBottom: 4 }}>
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
        gap: 14,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.lg,
        borderWidth: current ? 1.5 : t.hairline,
        borderColor: current ? t.colors.accent.clay : t.colors.border.subtle,
        padding: 14,
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
        gap: 12,
        backgroundColor: t.colors.surface.primary,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        borderColor: t.colors.border.subtle,
        padding: 12,
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
