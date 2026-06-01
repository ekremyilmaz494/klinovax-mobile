import type { TrainingDetail } from '@/types/staff';

/**
 * Sonuç ekranı feedback CTA gating saf mantığı —
 * `app/exam/[assignmentId]/result.tsx`'in `feedbackCta` çıkarımından extract edildi.
 */

/**
 * Eğitim detayındaki feedback durumuna göre "Geri bildirim ver" CTA'sı
 * gösterilmeli mi. Üç koşul birlikte: form gönderilebilir (canSubmit), henüz
 * gönderilmemiş (!submitted) ve bir attemptId var. Aksi halde `null` (CTA yok).
 */
export function resolveFeedbackCta(
  detail: Pick<TrainingDetail, 'feedback'> | null | undefined,
): { attemptId: string; mandatory: boolean } | null {
  const fb = detail?.feedback;
  if (fb?.canSubmit && !fb.submitted && fb.attemptId) {
    return { attemptId: fb.attemptId, mandatory: fb.mandatory };
  }
  return null;
}
