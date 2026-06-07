import type { FeedbackForm } from '@/types/feedback';

/**
 * Geri bildirim formu saf mantığı — `app/feedback/[attemptId].tsx`'in
 * `allRequiredAnswered` validation'ı ve submit payload builder'ından extract edildi.
 */

/** itemId → seçilen score (likert/yes-no) veya metin (text tipi). Ekrandaki AnswerState ile aynı. */
export type FeedbackAnswerState = Record<string, { score?: number; textAnswer?: string }>;

/**
 * yes_partial_no seçenekleri — score kodlaması web (feedback-helpers.ts
 * YES_PARTIAL_NO_LABELS) ile BİREBİR aynı olmalı: Evet=1, Kısmen=2, Hayır=3.
 * Ters çevrilirse web raporları aynı yanıtı farklı gösterir (sessiz veri bozulması);
 * bu bug bir kez yaşandı (mobil Evet=3 gönderiyordu). Tek kaynak burada.
 */
export const YES_PARTIAL_NO_OPTIONS: { label: string; score: number }[] = [
  { label: 'Evet', score: 1 },
  { label: 'Kısmen', score: 2 },
  { label: 'Hayır', score: 3 },
];

/** Tek bir cevabın "dolu" sayılıp sayılmadığı — score sayı VEYA text trim edilmiş boş değil. */
function hasValue(a: { score?: number; textAnswer?: string } | undefined): boolean {
  if (!a) return false;
  if (typeof a.score === 'number') return true;
  return !!a.textAnswer && a.textAnswer.trim().length > 0;
}

/**
 * Tüm zorunlu maddeler cevaplanmış mı (submit butonu gating). text tipi için
 * trim edilmiş boş olmayan metin, diğerleri için sayısal score gerekir.
 */
export function isFeedbackComplete(form: FeedbackForm, answers: FeedbackAnswerState): boolean {
  const requiredItems = form.categories.flatMap((c) => c.items).filter((it) => it.isRequired);
  return requiredItems.every((it) => {
    const a = answers[it.id];
    if (!a) return false;
    if (it.questionType === 'text') return !!a.textAnswer && a.textAnswer.trim().length > 0;
    return typeof a.score === 'number';
  });
}

/**
 * İlerleme göstergesi için cevaplanan/toplam madde sayısı (zorunlu + opsiyonel HEPSİ).
 * `isFeedbackComplete` ile AYNI "dolu" semantiği: text → trim edilmiş boş olmayan metin,
 * diğerleri → sayısal score.
 *
 * NOT: Bu submit gating DEĞİLdir. Gösterge tüm maddeleri sayar; submit butonu yalnız
 * zorunlular dolunca açılır (`isFeedbackComplete`). İkisi aynı per-madde kuralı paylaşır
 * ki "%100 ama gönder kapalı" çelişkisi oluşmasın.
 */
export function countFeedbackProgress(
  form: FeedbackForm,
  answers: FeedbackAnswerState,
): { answered: number; total: number } {
  const allItems = form.categories.flatMap((c) => c.items);
  const answered = allItems.filter((it) => {
    const a = answers[it.id];
    if (!a) return false;
    if (it.questionType === 'text') return !!a.textAnswer && a.textAnswer.trim().length > 0;
    return typeof a.score === 'number';
  }).length;
  return { answered, total: allItems.length };
}

/**
 * Submit payload'u — yalnızca dolu cevaplar gönderilir (opsiyonel boşlar atlanır).
 * score'lu cevap `{ itemId, score }`, metin cevabı `{ itemId, textAnswer }` (trim'li) olur.
 */
export function buildFeedbackPayload(
  answers: FeedbackAnswerState,
): { itemId: string; score?: number; textAnswer?: string }[] {
  return Object.entries(answers)
    .filter(([, a]) => hasValue(a))
    .map(([itemId, a]) =>
      typeof a.score === 'number'
        ? { itemId, score: a.score }
        : { itemId, textAnswer: a.textAnswer?.trim() },
    );
}
