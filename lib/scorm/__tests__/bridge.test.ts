import type { ScormAttempt } from '@/types/scorm';

import {
  buildScormApiInjection,
  buildSeedCmi,
  cmiSetValueToPatch,
  isScormCompletionStatus,
} from '../bridge';

describe('cmiSetValueToPatch — web kanonik eşleme', () => {
  it('lesson_status → lessonStatus', () => {
    expect(cmiSetValueToPatch('cmi.core.lesson_status', 'completed')).toEqual({
      lessonStatus: 'completed',
    });
  });

  it('score.raw → score (parseFloat)', () => {
    expect(cmiSetValueToPatch('cmi.core.score.raw', '87.5')).toEqual({ score: 87.5 });
  });

  it('geçersiz score → 0', () => {
    expect(cmiSetValueToPatch('cmi.core.score.raw', 'abc')).toEqual({ score: 0 });
  });

  it('total_time ve session_time → totalTime', () => {
    expect(cmiSetValueToPatch('cmi.core.total_time', '0000:10:00')).toEqual({
      totalTime: '0000:10:00',
    });
    expect(cmiSetValueToPatch('cmi.core.session_time', '0000:05:00')).toEqual({
      totalTime: '0000:05:00',
    });
  });

  it('suspend_data / completion_status / success_status', () => {
    expect(cmiSetValueToPatch('cmi.suspend_data', 'x=1')).toEqual({ suspendData: 'x=1' });
    expect(cmiSetValueToPatch('cmi.completion_status', 'completed')).toEqual({
      completionStatus: 'completed',
    });
    expect(cmiSetValueToPatch('cmi.success_status', 'passed')).toEqual({
      successStatus: 'passed',
    });
  });

  it('izlenmeyen anahtar → boş obje', () => {
    expect(cmiSetValueToPatch('cmi.core.student_name', 'Ada')).toEqual({});
    expect(cmiSetValueToPatch('cmi.core.lesson_location', '5')).toEqual({});
  });
});

describe('isScormCompletionStatus', () => {
  it('passed/completed → true', () => {
    expect(isScormCompletionStatus('passed')).toBe(true);
    expect(isScormCompletionStatus('completed')).toBe(true);
  });
  it('diğerleri / null → false', () => {
    expect(isScormCompletionStatus('incomplete')).toBe(false);
    expect(isScormCompletionStatus('failed')).toBe(false);
    expect(isScormCompletionStatus(null)).toBe(false);
    expect(isScormCompletionStatus(undefined)).toBe(false);
  });
});

describe('buildSeedCmi', () => {
  it('null attempt → varsayılanlar (not attempted, boş suspend)', () => {
    const seed = buildSeedCmi(null);
    expect(seed['cmi.core.lesson_status']).toBe('not attempted');
    expect(seed['cmi.suspend_data']).toBe('');
    expect(seed['cmi.core.score.raw']).toBe('');
    expect(seed['cmi.core.total_time']).toBe('0000:00:00');
  });

  it('attempt değerleri taşınır (resume)', () => {
    const attempt: ScormAttempt = {
      id: '1',
      attemptId: 'a1',
      suspendData: 'page=3',
      lessonStatus: 'incomplete',
      score: 42,
      totalTime: '0000:12:34',
      completionStatus: 'incomplete',
      successStatus: 'unknown',
    };
    const seed = buildSeedCmi(attempt);
    expect(seed['cmi.core.lesson_status']).toBe('incomplete');
    expect(seed['cmi.suspend_data']).toBe('page=3');
    expect(seed['cmi.core.score.raw']).toBe('42');
    expect(seed['cmi.core.total_time']).toBe('0000:12:34');
  });
});

describe('buildScormApiInjection', () => {
  it('window.API tanımlar, seed gömülür, true ile biter', () => {
    const js = buildScormApiInjection(buildSeedCmi(null));
    expect(js).toContain('window.API');
    expect(js).toContain('LMSInitialize');
    expect(js).toContain('LMSSetValue');
    expect(js).toContain('ReactNativeWebView.postMessage');
    expect(js).toContain('not attempted'); // seed gömülü
    expect(js.trim().endsWith('true;')).toBe(true);
  });

  it('seed suspend_data güvenli JSON olarak gömülür', () => {
    const js = buildScormApiInjection(
      buildSeedCmi({
        id: '1',
        attemptId: 'a',
        suspendData: 'a"b',
        lessonStatus: null,
        score: null,
        totalTime: null,
        completionStatus: null,
        successStatus: null,
      }),
    );
    // JSON.stringify "a\"b" → tırnak escape edilir, syntax bozulmaz.
    expect(js).toContain('a\\"b');
  });
});
