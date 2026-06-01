/**
 * Global jest mock'ları. Saf mantık testleri (lib/) çoğu native modüle ihtiyaç
 * duymaz; buradaki mock'lar yalnızca import zincirinin native bridge'e çarpıp
 * kırılmasını engeller (örn. client.ts → secure-store, exam.ts → router yok ama
 * defensive). Minimal tutulur.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// expo-secure-store — in-memory store. client.ts/secure-token.ts bu modülü
// import eder; gerçek SecureStore native bridge testte mevcut değil.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// expo-router — router spy + Stack passthrough. Ekran dosyaları bu modülü
// import eder; test ortamında navigation native modülü yok.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(() => ({})),
}));

// AsyncStorage — resmi jest mock'u (persister/online-bridge zincirleri için).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Sentry — no-op + captureException spy. client.ts/_layout zincirinde geçer.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  wrap: (c: unknown) => c,
}));

// NetInfo — online-bridge testlerinde import edilir.
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));
