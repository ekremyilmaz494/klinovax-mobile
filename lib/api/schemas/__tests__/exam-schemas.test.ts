import { validate } from '../index';
import {
  examQuestionsResponseSchema,
  examResultsResponseSchema,
  examStartResponseSchema,
  examSubmitResponseSchema,
  examTimerResponseSchema,
  examVideosResponseSchema,
  saveAnswerResponseSchema,
  videoProgressResponseSchema,
} from '../exam';

// Sentry'i mock'la — testte gerçek capture yapma, sadece çağrı sayımını gerek görürsek
// kontrol edebilelim. __DEV__ true olduğu için validate ayrıca console.warn çağırır.
jest.mock('@/lib/sentry', () => ({
  Sentry: { captureMessage: jest.fn() },
}));

describe('validate (graceful pass-through)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('geçerli yanıtta aynı objeyi döner ve console.warn çağrılmaz', () => {
    const data = {
      remainingSeconds: 120,
      expiresAt: 1717000000000,
      expired: false,
    };
    const out = validate(examTimerResponseSchema, data, 'exam.timer');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('bozuk yanıtta (yanlış tip) console.warn çağrılır ama veri yine döner — throw yok', () => {
    // duration string gelmiş → mismatch
    const data = {
      trainingTitle: 'Hijyen',
      attemptStatus: 'watching_videos',
      videos: [
        {
          id: 'v1',
          title: 'Bölüm 1',
          url: '/api/stream/v1',
          duration: '300', // backend yanlışlıkla string yolladı
          contentType: 'video',
          completed: false,
          lastPosition: 0,
        },
      ],
    };
    const out = validate(examVideosResponseSchema, data, 'exam.videos');
    expect(out).toBe(data);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('videos yanıtı watchedSeconds ile temiz geçer (mismatch yok)', () => {
    // Yeni backend her video için watchedSeconds döner — resume sayacı bundan başlar.
    const data = {
      trainingTitle: 'Hijyen',
      attemptStatus: 'watching_videos',
      videos: [
        {
          id: 'v1',
          title: 'Bölüm 1',
          url: '/api/stream/v1',
          duration: 300,
          contentType: 'video',
          completed: false,
          lastPosition: 240,
          watchedSeconds: 150,
        },
      ],
    };
    const out = validate(examVideosResponseSchema, data, 'exam.videos');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('videos yanıtında watchedSeconds eksikse mismatch SAYILMAZ (default 0, geriye dönük uyum)', () => {
    // Eski backend sürümü watchedSeconds döndürmeyebilir; schema .default(0) ile
    // tolere eder — sahte "şema uyuşmuyor" telemetrisi üretmesin.
    const data = {
      trainingTitle: 'Hijyen',
      attemptStatus: 'watching_videos',
      videos: [
        {
          id: 'v1',
          title: 'Bölüm 1',
          url: '/api/stream/v1',
          duration: 300,
          contentType: 'video',
          completed: false,
          lastPosition: 0,
        },
      ],
    };
    const out = validate(examVideosResponseSchema, data, 'exam.videos');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('eksik zorunlu alan mismatch sayılır ama veri korunur', () => {
    // allVideosCompleted eksik → kritik alan, mismatch
    const data = { progress: true };
    const out = validate(videoProgressResponseSchema, data, 'exam.videoProgress');
    expect(out).toBe(data);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('bilinmeyen ekstra alan mismatch SAYILMAZ (loose)', () => {
    const data = {
      id: 'a1',
      status: 'pre_exam',
      attemptNumber: 1,
      examOnly: false,
      // backend yeni alan ekledi — düşürülmemeli, mismatch olmamalı
      newBackendField: { nested: true },
    };
    const out = validate(examStartResponseSchema, data, 'exam.start');
    expect(out).toBe(data);
    // ileri uyum: ekstra alan korunur
    expect(out.newBackendField).toEqual({ nested: true });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('nullable alanlar doğru modellenir (results: null geçerli)', () => {
    const data = {
      isPassed: false,
      score: 40,
      passingScore: 70,
      attemptsRemaining: 2,
      results: null, // başarısızda anti-cheat → null geçerli
    };
    const out = validate(examResultsResponseSchema, data, 'exam.results');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('geçerli questions yanıtı temiz geçer', () => {
    const data = {
      trainingTitle: 'El Hijyeni',
      examType: 'pre',
      totalTime: 600,
      questions: [
        {
          id: 1,
          questionId: 'q-uuid',
          text: 'Soru?',
          options: [{ id: 'a', optionId: 'o-uuid', text: 'Seçenek' }],
        },
      ],
    };
    const out = validate(examQuestionsResponseSchema, data, 'exam.questions');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('geçerli pre-exam submit yanıtı temiz geçer', () => {
    const data = { phase: 'pre', score: 60, nextStep: 'videos' };
    const out = validate(examSubmitResponseSchema, data, 'exam.submit');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('geçerli post-exam submit yanıtı temiz geçer (results dahil)', () => {
    const data = {
      phase: 'post',
      score: 85,
      isPassed: true,
      passingScore: 70,
      attemptsRemaining: 2,
      feedbackRequired: false,
      results: [
        {
          questionText: 'Soru?',
          selectedOptionText: 'Cevap',
          correctOptionText: 'Cevap',
          isCorrect: true,
        },
      ],
    };
    const out = validate(examSubmitResponseSchema, data, 'exam.submit');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('submit yanıtında feedbackRequired eksikse mismatch loglanır ama veri döner', () => {
    const data = {
      phase: 'post',
      score: 40,
      isPassed: false,
      passingScore: 70,
      attemptsRemaining: 1,
      // feedbackRequired eksik — result yönlendirmesi için kritik alan
    };
    const out = validate(examSubmitResponseSchema, data, 'exam.submit');
    expect(out).toBe(data);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('submit yanıtında phase eksikse mismatch loglanır (akış dalı seçilemez)', () => {
    const data = { score: 60, nextStep: 'videos' };
    const out = validate(examSubmitResponseSchema, data, 'exam.submit');
    expect(out).toBe(data);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('geçerli save-answer yanıtı temiz geçer', () => {
    const data = { saved: true };
    const out = validate(saveAnswerResponseSchema, data, 'exam.saveAnswer');
    expect(out).toBe(data);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
