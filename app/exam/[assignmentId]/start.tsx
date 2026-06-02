import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack as ExpoStack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenError } from '@/components/ui/ScreenError';
import { Button, Stack, Text, useTheme } from '@/design-system';
import { ApiError } from '@/lib/api/client';
import { startExam } from '@/lib/api/exam';
import { extractPendingFeedbackRoute, resolveStartRoute } from '@/lib/exam/start-routing';
import { useOnline } from '@/lib/network/use-online';

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
      // attemptId çıkmazsa ama hâlâ 423 ise fallback bilgilendirme.
      if (err instanceof ApiError && err.status === 423) {
        Alert.alert(
          'Geri bildirim bekleniyor',
          'Bir önceki eğitim için zorunlu geri bildirim formunu doldurman gerekiyor. Form şimdi açılacak.',
        );
        return;
      }
      // Diğer hatalar mevcut ScreenError component'inde gösteriliyor (error state).
    },
  });

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
