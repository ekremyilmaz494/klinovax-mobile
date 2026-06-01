// @ts-nocheck — jest tipleri PR-A (feat/test-infra) ile gelir; rebase sonrası bu satır kaldırılacak
/* eslint-disable import/no-unresolved -- @testing-library/react-native PR-A ile kurulur */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RouterErrorBoundary } from '@/components/ui/RouterErrorBoundary';
import { Sentry } from '@/lib/sentry';

// captureBoundaryError gerçek implementasyonu Sentry.captureException'a delege eder;
// sadece captureException'ı mock'layıp tag payload'unu da doğruluyoruz.
jest.mock('@/lib/sentry', () => {
  const captureException = jest.fn();
  return {
    Sentry: { captureException },
    captureBoundaryError: (error: Error, context?: string) =>
      captureException(error, { tags: { boundary: context ?? 'root' } }),
  };
});

describe('RouterErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throw eden child yerine Türkçe fallback gösterir', () => {
    const error = new Error('patladı');
    render(<RouterErrorBoundary error={error} retry={jest.fn()} />);

    expect(screen.getByText('Bir şeyler ters gitti')).toBeTruthy();
    expect(screen.getByText('Beklenmeyen bir hata oluştu. Tekrar deneyebilirsin.')).toBeTruthy();
  });

  it('mount olunca Sentry.captureException bir kez çağrılır', () => {
    const error = new Error('patladı');
    render(<RouterErrorBoundary error={error} retry={jest.fn()} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { boundary: 'root' },
    });
  });

  it('"Tekrar dene" butonuna basınca retry çağrılır', () => {
    const retry = jest.fn();
    render(<RouterErrorBoundary error={new Error('patladı')} retry={retry} />);

    fireEvent.press(screen.getByText('Tekrar dene'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
