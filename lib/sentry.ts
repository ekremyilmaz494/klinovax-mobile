import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// EXPO_PUBLIC_SENTRY_DSN tanımlı değilse Sentry başlatılmaz — sessiz no-op.
// DSN'i EAS build profile'larında env olarak ekleyin (eas.json), ya da
// `eas env:create` ile production secret olarak yükleyin. Source map upload
// için ayrıca SENTRY_AUTH_TOKEN secret'ı gerekli (config plugin otomatik kullanır).

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'tcNo',
  'tcKimlikNo',
  'creditCard',
  'phone',
  'email',
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redact(v);
  }
  return out;
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  // Dev'de gürültü olmasın; DSN yokken kurulum yapma.
  if (__DEV__ || !dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
    release: Constants.expoConfig?.version ?? 'unknown',
    dist:
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode?.toString(),
    tracesSampleRate: 0.05,
    enableAutoPerformanceTracing: true,
    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = redact(event.request.data) as typeof event.request.data;
      }
      if (event.request?.headers) {
        const headers = { ...event.request.headers } as Record<string, string>;
        for (const k of ['authorization', 'cookie', 'x-api-key']) {
          if (k in headers) headers[k] = '[REDACTED]';
        }
        event.request.headers = headers;
      }
      return event;
    },
    ignoreErrors: [
      'AbortError',
      'The operation was aborted',
      // Offline'da kullanıcı zaten bilgilendiriliyor (OfflineBanner) — Sentry'ye gerek yok
      'Network request failed',
    ],
  });
}

export { Sentry };
