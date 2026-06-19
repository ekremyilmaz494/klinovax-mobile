import { clearLastUnlockAt } from '@/lib/auth/biometric-policy';
import { clearSession } from '@/lib/auth/secure-token';
import { unregisterPushToken } from '@/lib/notifications/push';

// Native/zincir bağımlılıklarını izole et — bu test yalnızca logout sıra/etkilerini doğrular.
jest.mock('@/lib/config', () => ({ API_BASE_URL: 'https://api.test' }));
jest.mock('@/lib/auth/biometric-policy', () => ({
  clearLastUnlockAt: jest.fn(async () => {}),
}));
jest.mock('@/lib/notifications/push', () => ({
  unregisterPushToken: jest.fn(async () => {}),
}));
jest.mock('@/lib/auth/biometric-flag', () => ({
  getBiometricEnabled: jest.fn(async () => false),
}));
jest.mock('@/lib/auth/secure-token', () => ({
  clearSession: jest.fn(async () => {}),
  loadSession: jest.fn(async () => null),
  saveSession: jest.fn(async () => {}),
}));

// eslint-disable-next-line import/first
import { useAuthStore } from '@/store/auth';

describe('auth store — logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lastUnlockAt temizlenir — ortak cihazda same-day biyometrik baypası bir sonraki oturuma sızmasın', async () => {
    await useAuthStore.getState().logout();
    expect(clearLastUnlockAt).toHaveBeenCalledTimes(1);
  });

  it('push token unregister, clearSession ÇAĞRILIR ve store sıfırlanır', async () => {
    await useAuthStore.getState().logout();
    expect(unregisterPushToken).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
