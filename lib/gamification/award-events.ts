import type { GamificationEventBody } from '@/types/gamification';

/**
 * Bir başarı anından doğrulanabilir puan olayları üretir (SAF — yan etkisiz).
 * Ekran sadece elindeki id'leri verir; gönderim/invalidate `useAward`'da.
 *
 * Tasarım kuralı — `eventId === refId`: stabil kayıt uuid'si idempotency anahtarı
 * olur. Backend dedupKey `${type}:${eventId}` ile kredi BİR kez verir → ekran
 * re-mount'unda veya çift gönderimde puan tekrarlanmaz.
 *
 * Yanlış/eksik refId backend `verifyEvent` tarafında sessiz 422'ye yol açar
 * (anti-cheat), bu yüzden id YOKSA olay HİÇ üretilmez (boş dizi / null).
 */

/** uuid değilse olay üretme — backend `z.string().uuid()` ile 400/422 döner. */
function isUuid(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Sınav geçildiğinde (post-exam passed → assignment passed) üretilecek olaylar.
 *
 * - `training_complete`: refId = TrainingAssignment.id (mobil route param `assignmentId`).
 *   Daima üretilir (id elde) → Leitner havuzunu anlık seed eder + 30 puan.
 * - `exam_pass`: refId = ExamAttempt.id. Backend results yanıtı şu an attemptId
 *   DÖNDÜRMÜYOR (bkz. backend istek listesi). `attemptId` gelmezse olay atlanır —
 *   puan kaybı değil; training_complete zaten seed + kredi sağlar. Backend alanı
 *   ekleyince exam_pass (50 puan) mobil değişikliği olmadan otomatik etkinleşir.
 */
export function buildExamPassedEvents(input: {
  assignmentId: string | null | undefined;
  attemptId?: string | null;
}): GamificationEventBody[] {
  const events: GamificationEventBody[] = [];
  if (isUuid(input.assignmentId)) {
    events.push({
      type: 'training_complete',
      refId: input.assignmentId,
      eventId: input.assignmentId,
    });
  }
  if (isUuid(input.attemptId)) {
    events.push({ type: 'exam_pass', refId: input.attemptId, eventId: input.attemptId });
  }
  return events;
}

/**
 * Geri bildirim gönderildiğinde — refId = TrainingFeedbackResponse.id (submit
 * yanıtındaki `responseId`). 409 "zaten gönderildi" dalında responseId gelmez →
 * null (olay ilk gönderimde zaten ateşlenmiştir).
 */
export function buildFeedbackEvent(
  responseId: string | null | undefined,
): GamificationEventBody | null {
  if (!isUuid(responseId)) return null;
  return { type: 'feedback_submit', refId: responseId, eventId: responseId };
}
