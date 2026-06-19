import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { startExam } from '@/lib/api/exam';
import { extractPendingFeedbackRoute, resolveStartRoute } from '@/lib/exam/start-routing';
import { useOnline } from '@/lib/network/use-online';

/**
 * POST /start akışı — `start.tsx` ekranındaki mutation bloğundan çıkarıldı ki hem
 * o ekran (fresh ilk deneme: kuralları göster, butonda çağır) hem eğitim detayı CTA'sı
 * (retry: ara ekran açmadan yerinde çağır) tek source-of-truth'tan beslensin.
 *
 * Saf karar mantığı `lib/exam/start-routing.ts`'te (resolveStartRoute /
 * extractPendingFeedbackRoute) kalır; bu hook yalnızca onları orkestre eder.
 *
 * `navigate` enjekte edilir çünkü iki çağrı noktasının stack davranışı farklı:
 *   - start.tsx → `router.replace` (kurallar ekranını hedefle değiştir)
 *   - detay CTA → `router.push` (detay stack'te kalsın; videodan geri → detay)
 * 423 (zorunlu feedback) navigasyonu her iki bağlamda da `push` — formdan geri dönülür.
 */
export function useStartExam(
  assignmentId: string,
  opts?: {
    navigate?: (href: Href) => void;
    onUnknownStatus?: () => void;
    /** Generic (non-423/non-offline) hata: start.tsx `error`+ScreenError ile gösterir; detay CTA Alert ister. */
    onError?: (err: Error) => void;
  },
): { start: () => void; isPending: boolean; isOnline: boolean; error: Error | null } {
  const qc = useQueryClient();
  const { isOnline } = useOnline();
  const navigate = opts?.navigate ?? router.replace;
  const onUnknownStatus = opts?.onUnknownStatus ?? router.back;

  const mutation = useMutation({
    mutationFn: () => startExam(assignmentId),
    networkMode: 'online',
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-trainings'] });
      qc.invalidateQueries({ queryKey: ['staff-dashboard'] });
      // training-detail iki farklı id ile key'lenebiliyor: start.tsx/result.tsx
      // assignmentId, trainings/[id].tsx route param (trainingId olabilir) — backend
      // my-trainings detayını her iki id ile de kabul ettiğinden tek id ile invalidate
      // hep birini kaçırırdı. Prefix ile tüm training-detail girdilerini tazele.
      qc.invalidateQueries({ queryKey: ['training-detail'] });
      const route = resolveStartRoute(data.status);
      if (!route) {
        // Bilinmeyen attempt status (örn. yeni backend sürümü farklı durum döndürdü) —
        // sessiz no-op kullanıcıyı "Başlatılıyor…" sonrası boşlukta bırakıyordu.
        console.warn('[use-start-exam] bilinmeyen attempt status', data.status);
        Alert.alert(
          'Sınav durumu alınamadı',
          'Eğitim sayfasına dönülüyor. Sorun devam ederse uygulamayı güncelleyin veya kurum yöneticinizle iletişime geçin.',
          [{ text: 'Tamam', onPress: onUnknownStatus }],
        );
        return;
      }
      switch (route.kind) {
        case 'questions':
          navigate(`/exam/${assignmentId}/questions?phase=${route.phase}`);
          break;
        case 'videos':
          navigate(`/exam/${assignmentId}/videos`);
          break;
        case 'result':
          navigate(`/exam/${assignmentId}/result`);
          break;
        case 'detail':
          navigate(`/trainings/${assignmentId}`);
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
            { text: 'Eğitimlerime git', onPress: () => router.replace('/(tabs)/trainings') },
          ],
        );
        return;
      }
      // Diğer hatalar: start.tsx `error` state'iyle ScreenError gösteriyor; detay
      // CTA'sının inline hata alanı yok, onError ile Alert basabilir.
      opts?.onError?.(err as Error);
    },
  });

  const start = () => {
    if (!isOnline) {
      Alert.alert(
        'İnternet gerekli',
        'Sınav başlatmak için internet bağlantısı gerekiyor. Lütfen bağlantınızı kontrol edin.',
      );
      return;
    }
    mutation.mutate();
  };

  return {
    start,
    isPending: mutation.isPending,
    isOnline,
    error: mutation.error as Error | null,
  };
}
