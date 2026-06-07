// apiFetch'i mock'la — her exam helper'ının doğru path/method/body ile çağırdığını
// doğrula. Gerçek fetch/secure-store devreye girmez; saf çağrı şekli testi.
import { apiFetch } from '@/lib/api/client';
import {
  fetchExamQuestions,
  fetchExamResults,
  fetchExamTimer,
  fetchExamVideos,
  saveExamAnswer,
  saveVideoProgress,
  startExam,
  submitExam,
} from '../exam';

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(async () => ({})),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('exam API helper path/method/body', () => {
  it('startExam → POST /start', async () => {
    await startExam('a1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/start', { method: 'POST' });
  });

  it('fetchExamQuestions → GET + phase query', async () => {
    await fetchExamQuestions('a1', 'post');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/questions?phase=post');
  });

  it('saveExamAnswer → POST /save-answer + body', async () => {
    await saveExamAnswer('a1', {
      questionId: 'q1',
      selectedOptionId: 'o1',
      examPhase: 'pre',
    });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/save-answer', {
      method: 'POST',
      body: JSON.stringify({ questionId: 'q1', selectedOptionId: 'o1', examPhase: 'pre' }),
    });
  });

  it('submitExam → POST /submit + body', async () => {
    const answers = [{ questionId: 'q1', selectedOptionId: 'o1' }];
    await submitExam('a1', { answers, phase: 'post' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/submit', {
      method: 'POST',
      body: JSON.stringify({ answers, phase: 'post' }),
    });
  });

  it('fetchExamResults → GET /results', async () => {
    await fetchExamResults('a1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/results');
  });

  it('fetchExamVideos → GET /videos', async () => {
    await fetchExamVideos('a1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/videos');
  });

  it('fetchExamVideos review modu → ?mode=review', async () => {
    await fetchExamVideos('a1', { review: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/videos?mode=review');
  });

  it('fetchExamVideos review=false → query eklenmez (geriye uyumlu)', async () => {
    await fetchExamVideos('a1', { review: false });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/videos');
  });

  it('saveVideoProgress → POST /videos + body', async () => {
    await saveVideoProgress('a1', { videoId: 'v1', watchedTime: 90, completed: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/videos', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'v1', watchedTime: 90, completed: true }),
    });
  });

  it('fetchExamTimer → POST /timer', async () => {
    await fetchExamTimer('a1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/exam/a1/timer', { method: 'POST' });
  });
});
