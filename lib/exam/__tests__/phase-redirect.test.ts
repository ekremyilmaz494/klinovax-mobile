import { ApiError } from '@/lib/api/client';

import { extractPhaseRedirect, phaseRedirectCopy, phaseRedirectRoute } from '../phase-redirect';

describe('extractPhaseRedirect', () => {
  it("403 + nested JSON error string'den redirect çıkarır (gerçek backend yanıtı)", () => {
    const err = new ApiError(403, {
      error: JSON.stringify({
        message: 'Bu işlem şu anki aşamada yapılamaz',
        currentPhase: 'watching_videos',
        redirect: 'videos',
      }),
    });
    expect(extractPhaseRedirect(err)).toEqual({
      redirect: 'videos',
      message: 'Bu işlem şu anki aşamada yapılamaz',
    });
  });

  it('403 ama düz string error (JSON değil) → null', () => {
    expect(extractPhaseRedirect(new ApiError(403, { error: 'Yetkisiz' }))).toBeNull();
  });

  it('403 ama redirect alanı yok → null', () => {
    const err = new ApiError(403, { error: JSON.stringify({ message: 'x' }) });
    expect(extractPhaseRedirect(err)).toBeNull();
  });

  it('403 olmayan ApiError → null', () => {
    expect(
      extractPhaseRedirect(new ApiError(500, { error: JSON.stringify({ redirect: 'videos' }) })),
    ).toBeNull();
  });

  it('ApiError olmayan hata → null', () => {
    expect(extractPhaseRedirect(new Error('boom'))).toBeNull();
    expect(extractPhaseRedirect(null)).toBeNull();
  });
});

describe('phaseRedirectRoute', () => {
  it("'videos' → videos ekranı", () => {
    expect(phaseRedirectRoute('videos')).toEqual({ kind: 'videos' });
  });

  it("'pre-exam' / 'pre' → ön sınav", () => {
    expect(phaseRedirectRoute('pre-exam')).toEqual({ kind: 'questions', phase: 'pre' });
    expect(phaseRedirectRoute('pre')).toEqual({ kind: 'questions', phase: 'pre' });
  });

  it('bilinmeyen → eğitim detayı (güvenli varsayılan, çıkmaz/loop önler)', () => {
    expect(phaseRedirectRoute('post-exam')).toEqual({ kind: 'detail' });
    expect(phaseRedirectRoute('whatever')).toEqual({ kind: 'detail' });
  });
});

describe('phaseRedirectCopy', () => {
  it('videos için anlamlı Türkçe metin', () => {
    const c = phaseRedirectCopy('videos');
    expect(c.cta).toBe('Videolara dön');
    expect(c.title.length).toBeGreaterThan(0);
  });

  it('bilinmeyen redirect → eğitim sayfası fallback metni', () => {
    expect(phaseRedirectCopy('xyz').cta).toBe('Eğitim sayfasına dön');
  });
});
