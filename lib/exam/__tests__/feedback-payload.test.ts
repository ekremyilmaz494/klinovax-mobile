import type { FeedbackForm } from '@/types/feedback';

import {
  buildFeedbackPayload,
  isFeedbackComplete,
  YES_PARTIAL_NO_OPTIONS,
} from '../feedback-payload';

describe('YES_PARTIAL_NO_OPTIONS — web kanonik skorlama', () => {
  // KRİTİK: web feedback-helpers.ts YES_PARTIAL_NO_LABELS ile birebir aynı olmalı.
  // Ters çevrilirse (örn. Evet=3) web raporları yanıtı yanlış gösterir.
  it('Evet=1, Kısmen=2, Hayır=3', () => {
    expect(YES_PARTIAL_NO_OPTIONS).toEqual([
      { label: 'Evet', score: 1 },
      { label: 'Kısmen', score: 2 },
      { label: 'Hayır', score: 3 },
    ]);
  });
});

function form(): FeedbackForm {
  return {
    id: 'f1',
    title: 'Eğitim Değerlendirme',
    description: '',
    documentCode: 'EY.FR.40',
    categories: [
      {
        id: 'c1',
        name: 'Genel',
        order: 1,
        items: [
          {
            id: 'i-likert',
            text: 'Memnuniyet',
            questionType: 'likert_5',
            isRequired: true,
            order: 1,
          },
          { id: 'i-text', text: 'Yorum', questionType: 'text', isRequired: true, order: 2 },
          { id: 'i-opt', text: 'Ek görüş', questionType: 'text', isRequired: false, order: 3 },
        ],
      },
    ],
  };
}

describe('isFeedbackComplete', () => {
  it('zorunlu text boşsa → incomplete', () => {
    const answers = { 'i-likert': { score: 5 }, 'i-text': { textAnswer: '   ' } };
    expect(isFeedbackComplete(form(), answers)).toBe(false);
  });

  it('zorunlu score eksikse → incomplete', () => {
    const answers = { 'i-text': { textAnswer: 'Güzeldi' } };
    expect(isFeedbackComplete(form(), answers)).toBe(false);
  });

  it('tüm zorunlular doluysa → complete (opsiyonel boş olabilir)', () => {
    const answers = { 'i-likert': { score: 4 }, 'i-text': { textAnswer: 'Faydalıydı' } };
    expect(isFeedbackComplete(form(), answers)).toBe(true);
  });

  it('score 0 da geçerli sayısal cevaptır (typeof number)', () => {
    const answers = { 'i-likert': { score: 0 }, 'i-text': { textAnswer: 'x' } };
    expect(isFeedbackComplete(form(), answers)).toBe(true);
  });
});

describe('buildFeedbackPayload', () => {
  it('boş ve whitespace cevapları filtreler', () => {
    const answers = {
      'i-likert': { score: 3 },
      'i-text': { textAnswer: 'iyi' },
      'i-opt': { textAnswer: '   ' }, // sadece boşluk — atlanır
    };
    const payload = buildFeedbackPayload(answers);
    expect(payload).toEqual([
      { itemId: 'i-likert', score: 3 },
      { itemId: 'i-text', textAnswer: 'iyi' },
    ]);
  });

  it('text cevapları trim eder', () => {
    const payload = buildFeedbackPayload({ 'i-text': { textAnswer: '  boşluklu  ' } });
    expect(payload).toEqual([{ itemId: 'i-text', textAnswer: 'boşluklu' }]);
  });

  it('hiç cevap yoksa boş dizi', () => {
    expect(buildFeedbackPayload({})).toEqual([]);
  });
});
