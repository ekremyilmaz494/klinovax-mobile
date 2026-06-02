import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Card, Stack, Text, useTheme } from '@/design-system';
import { ApiError, apiFetch } from '@/lib/api/client';
import { startExam } from '@/lib/api/exam';
import { extractPendingFeedbackRoute, resolveStartRoute } from '@/lib/exam/start-routing';
import { useOnline } from '@/lib/network/use-online';
import type { TrainingDetail } from '@/types/staff';

/**
 * Sınav öncesi kurallar ekranı. "Başla" butonu /exam/[id]/start çağırır
 * ve attempt status'üne göre uygun ekrana yönlendirir.
 */
export default function ExamStartScreen() {
  const t = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const qc = useQueryClient();
  const { isOnline } = useOnline();

  const startMutation = useMutation({
    mutationFn: () => startExam(assignmentId),
    networkMode: 'online',
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-trainings'] });
      qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
      qc.invalidateQueries({ queryKey: ['training-detail', assignmentId] });
      const route = resolveStartRoute(data.status);
      if (!route) {
        // Bilinmeyen attempt status (örn. yeni backend sürümü farklı durum döndürdü) —
        // sessiz no-op kullanıcıyı "Başlatılıyor…" sonrası boşlukta bırakıyordu.
        console.warn('[exam-start] bilinmeyen attempt status', data.status);
        Alert.alert(
          'Sınav durumu alınamadı',
          'Eğitim sayfasına dönülüyor. Sorun devam ederse uygulamayı güncelleyin veya kurum yöneticinizle iletişime geçin.',
          [{ text: 'Tamam', onPress: () => router.back() }],
        );
        return;
      }
      switch (route.kind) {
        case 'questions':
          router.replace(`/exam/${assignmentId}/questions?phase=${route.phase}`);
          break;
        case 'videos':
          router.replace(`/exam/${assignmentId}/videos`);
          break;
        case 'result':
          router.replace(`/exam/${assignmentId}/result`);
          break;
        case 'detail':
          router.replace(`/trainings/${assignmentId}`);
          break;
      }
    },
    onError: (err) => {
      // Backend 423 + pendingFeedback: kullanıcı başka bir eğitim için zorunlu
      // geri bildirimi tamamlamadan yeni eğitim başlatamaz. Formu app içinde aç.
      const pending = extractPendingFeedbackRoute(err);
      if (pending) {
        router.push({
          pathname: '/feedback/[attemptId]',
          params: { attemptId: pending.attemptId, title: pending.trainingTitle ?? '' },
        });
        return;
      }
      // attemptId çıkmazsa ama hâlâ 423 ise fallback bilgilendirme. Form otomatik
      // AÇILAMAZ (hangi attempt'e ait olduğu bilinmiyor) — kullanıcıyı formun
      // bulunduğu yere yönlendir, "form açılacak" deme.
      if (err instanceof ApiError && err.status === 423) {
        Alert.alert(
          'Geri bildirim bekleniyor',
          'Bir önceki eğitim için zorunlu geri bildirim formunu doldurman gerekiyor. Formu Eğitimlerim sekmesindeki uyarı kartından açabilirsin.',
          [
            { text: 'Kapat', style: 'cancel' },
            {
              text: 'Eğitimlerime git',
              onPress: () => router.replace('/(tabs)/trainings'),
            },
          ],
        );
        return;
      }
      // Diğer hatalar mevcut ScreenError component'inde gösteriliyor (error state).
    },
  });

  // Sınav meta bilgisi — trainings/[id].tsx ile aynı query key (cache paylaşımı):
  // kullanıcı eğitim detayından geldiği için veri çoğunlukla zaten cache'te,
  // ekstra bekleme yaratmaz. Yoksa arka planda çekilir, gelince gösterilir.
  const { data: detail } = useQuery<TrainingDetail, Error>({
    queryKey: ['training-detail', assignmentId],
    queryFn: () => apiFetch<TrainingDetail>(`/api/staff/my-trainings/${assignmentId}`),
  });
  const remainingAttempts = detail ? Math.max(detail.maxAttempts - detail.currentAttempt, 0) : null;

  const error = startMutation.error as Error | null;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.surface.canvas }}>
      <ExpoStack.Screen options={{ title: 'Sınav başlat', headerBackTitle: 'Geri' }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text variant="overline" tone="tertiary" style={{ marginBottom: 8 }}>
          SINAV
        </Text>
        <Text variant="title-1">Başlamadan önce</Text>
        <Text variant="body" tone="tertiary" style={{ marginTop: 8 }}>
          Sınava başlamadan önce aşağıdaki kuralları okuyun.
        </Text>

        {detail ? (
          // 2x2 bilgi ızgarası: 4 hücre tek satıra sığmaz (küçük ekran + Dynamic Type).
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 20,
              backgroundColor: t.colors.surface.primary,
              borderRadius: t.radius.lg,
              borderWidth: t.hairline,
              borderColor: t.colors.border.subtle,
            }}
          >
            <InfoCell
              label="Sınav süresi"
              value={detail.examDuration ? `${detail.examDuration} dk` : '—'}
              divider
            />
            <InfoCell label="Geçme barajı" value={`%${detail.passingScore}`} />
            <InfoCell
              label="Soru sayısı"
              value={detail.questionCount != null ? `${detail.questionCount}` : '—'}
              divider
              borderTop
            />
            <InfoCell
              label="Kalan deneme"
              value={
                remainingAttempts !== null ? `${remainingAttempts}/${detail.maxAttempts}` : '—'
              }
              borderTop
            />
          </View>
        ) : null}

        {remainingAttempts === 1 ? (
          <Card variant="warning" rail style={{ marginTop: 12 }}>
            <Text variant="body" tone="primary">
              Bu{' '}
              <Text variant="body" style={{ fontFamily: 'InterTight_600SemiBold' }}>
                son deneme hakkın
              </Text>
              . Başarısız olursan yöneticinden ek deneme hakkı talep etmen gerekir.
            </Text>
          </Card>
        ) : null}

        <View
          style={{
            marginTop: 28,
            backgroundColor: t.colors.surface.primary,
            borderRadius: t.radius.lg,
            borderWidth: t.hairline,
            borderColor: t.colors.border.subtle,
            padding: 18,
            gap: 14,
          }}
        >
          <Rule n={1} text="Sınava başladığınızda süreniz işlemeye başlar." />
          <Rule n={2} text="Cevaplarınız her seçimde otomatik kaydedilir." />
          <Rule n={3} text="Soruları istediğiniz sırada cevaplayabilirsiniz." />
          <Rule
            n={4}
            text="Uygulamayı kapatırsanız sayım devam eder; süre dolarsa otomatik gönderilir."
          />
          <Rule
            n={5}
            text="Son sınavda bir sorunun cevabı 30 saniye içinde değiştirilebilir, sonra kilitlenir."
          />
          <Rule
            n={6}
            text="Eğitim videolarının en az %90'ını izlemeden son sınav açılmaz; izleme ilerlemen otomatik kaydedilir."
          />
          <Rule
            n={7}
            text="Son sınavı geçtiğinde sertifikan otomatik oluşturulur ve Sertifikalarım sekmesinde görünür."
          />
        </View>

        {error ? (
          <ScreenError
            message={error.message || 'Sınav başlatılamadı.'}
            onRetry={() => startMutation.mutate()}
          />
        ) : null}

        <View style={{ marginTop: 32 }}>
          <Button
            label={
              !isOnline
                ? 'İnternet bekleniyor…'
                : startMutation.isPending
                  ? 'Başlatılıyor…'
                  : 'Sınava başla'
            }
            variant="primary"
            size="lg"
            loading={startMutation.isPending}
            disabled={startMutation.isPending || !isOnline}
            onPress={() => {
              if (!isOnline) {
                Alert.alert(
                  'İnternet gerekli',
                  'Sınav başlatmak için internet bağlantısı gerekiyor. Lütfen bağlantınızı kontrol edin.',
                );
                return;
              }
              startMutation.mutate();
            }}
            fullWidth
          />
          <View style={{ marginTop: 12 }}>
            <Button label="Vazgeç" variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCell({
  label,
  value,
  divider,
  borderTop,
}: {
  label: string;
  value: string;
  /** Sağ kenarlık — satırdaki soldaki hücreye verilir. */
  divider?: boolean;
  /** Üst kenarlık — 2x2 ızgaranın alt satırındaki hücrelere verilir. */
  borderTop?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        width: '50%',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRightWidth: divider ? t.hairline : 0,
        borderRightColor: t.colors.border.subtle,
        borderTopWidth: borderTop ? t.hairline : 0,
        borderTopColor: t.colors.border.subtle,
      }}
    >
      <Text variant="overline" tone="tertiary" style={{ marginBottom: 4 }}>
        {label}
      </Text>
      <Text variant="bodyEmph" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

function Rule({ n, text }: { n: number; text: string }) {
  const t = useTheme();
  return (
    <Stack direction="row" align="flex-start" gap={3}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: t.colors.accent.clay,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <Text
          style={{
            fontFamily: 'Fraunces_700Bold',
            fontSize: 14,
            color: t.colors.accent.clayOnAccent,
            lineHeight: 16,
          }}
        >
          {n}
        </Text>
      </View>
      <Text variant="body" style={{ flex: 1 }}>
        {text}
      </Text>
    </Stack>
  );
}
