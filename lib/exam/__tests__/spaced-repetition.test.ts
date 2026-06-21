import {
  isDue,
  LEITNER_INTERVALS_DAYS,
  MAX_BOX,
  nextBox,
  nextReviewDate,
  selectTodaysQuestions,
} from '../spaced-repetition';

describe('nextBox — Leitner kutu geçişi', () => {
  it('doğru cevapta kutuyu bir üste taşır', () => {
    expect(nextBox({ currentBox: 2, correct: true })).toBe(3);
  });

  it('en üst kutuda doğru cevapta tavanda kalır (MAX_BOX)', () => {
    expect(nextBox({ currentBox: MAX_BOX, correct: true })).toBe(MAX_BOX);
  });

  it('yanlış cevapta kutu 0 a düşer (sık tekrar)', () => {
    expect(nextBox({ currentBox: 4, correct: false })).toBe(0);
  });

  it('en üst kutuda yanlış cevapta da 0 a düşer', () => {
    expect(nextBox({ currentBox: MAX_BOX, correct: false })).toBe(0);
  });

  it('kutu 0 da doğru cevapta 1 e çıkar', () => {
    expect(nextBox({ currentBox: 0, correct: true })).toBe(1);
  });

  it('aralık dışı (negatif) kutu defansif olarak 0 a kıstırılır', () => {
    expect(nextBox({ currentBox: -3, correct: true })).toBe(1);
  });

  it('aralık dışı (çok büyük) kutu MAX_BOX a kıstırılır', () => {
    expect(nextBox({ currentBox: 99, correct: true })).toBe(MAX_BOX);
  });
});

describe('nextReviewDate — tekrar tarihi hesabı', () => {
  it('kutu 0 da aynı an döner (0 gün eklenir)', () => {
    const from = new Date(2026, 5, 21, 9, 0, 0);
    expect(nextReviewDate({ box: 0, from }).getTime()).toBe(from.getTime());
  });

  it('kutu 1 de 1 gün sonrasını döner', () => {
    const from = new Date(2026, 5, 21, 9, 0, 0);
    const expected = new Date(2026, 5, 22, 9, 0, 0);
    expect(nextReviewDate({ box: 1, from }).getTime()).toBe(expected.getTime());
  });

  it('kutu 5 te 35 gün sonrasını döner', () => {
    const from = new Date(2026, 5, 21, 9, 0, 0);
    const expected = new Date(2026, 6, 26, 9, 0, 0); // 21 Haziran + 35 gün = 26 Temmuz
    expect(nextReviewDate({ box: 5, from }).getTime()).toBe(expected.getTime());
  });

  it('from tarihini mutate etmez (yan etki yok)', () => {
    const from = new Date(2026, 5, 21, 9, 0, 0);
    const before = from.getTime();
    nextReviewDate({ box: 3, from });
    expect(from.getTime()).toBe(before);
  });
});

describe('isDue — vade kontrolü', () => {
  it('tam sınırda (now === nextReviewAt) true (kıl payı vadesi gelmiş)', () => {
    const at = new Date(2026, 5, 21, 9, 0, 0);
    expect(isDue({ nextReviewAt: at, now: new Date(at.getTime()) })).toBe(true);
  });

  it('vadeden önce false', () => {
    const at = new Date(2026, 5, 21, 9, 0, 0);
    const now = new Date(2026, 5, 20, 9, 0, 0);
    expect(isDue({ nextReviewAt: at, now })).toBe(false);
  });

  it('vadeden sonra true', () => {
    const at = new Date(2026, 5, 21, 9, 0, 0);
    const now = new Date(2026, 5, 22, 9, 0, 0);
    expect(isDue({ nextReviewAt: at, now })).toBe(true);
  });
});

describe('selectTodaysQuestions — bugünün soru seçimi', () => {
  const now = new Date(2026, 5, 21, 9, 0, 0);
  const due1 = { id: 'a', nextReviewAt: new Date(2026, 5, 19, 9, 0, 0) }; // en eski vade
  const due2 = { id: 'b', nextReviewAt: new Date(2026, 5, 20, 9, 0, 0) };
  const notDue = { id: 'c', nextReviewAt: new Date(2026, 5, 25, 9, 0, 0) };

  it('yalnızca vadesi gelmiş soruları döner', () => {
    const result = selectTodaysQuestions({ pool: [due1, due2, notDue], now, limit: 10 });
    expect(result.map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('en eski vade önce gelecek şekilde sıralar', () => {
    const result = selectTodaysQuestions({ pool: [due2, due1], now, limit: 10 });
    expect(result.map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('limit kadar keser', () => {
    const result = selectTodaysQuestions({ pool: [due1, due2], now, limit: 1 });
    expect(result.map((q) => q.id)).toEqual(['a']);
  });

  it('boş havuzda boş dizi döner', () => {
    expect(selectTodaysQuestions({ pool: [], now, limit: 5 })).toEqual([]);
  });

  it('girdi havuzunu mutate etmez (yan etki yok)', () => {
    const pool = [due2, due1];
    selectTodaysQuestions({ pool, now, limit: 10 });
    expect(pool.map((q) => q.id)).toEqual(['b', 'a']);
  });
});

describe('Leitner sabitleri — backend ile senkron regresyon kilidi', () => {
  it('aralık tablosu [0, 1, 3, 7, 16, 35] olarak kalmalı', () => {
    expect(LEITNER_INTERVALS_DAYS).toEqual([0, 1, 3, 7, 16, 35]);
  });

  it('MAX_BOX 5 olmalı (6 kutu)', () => {
    expect(MAX_BOX).toBe(5);
  });
});
