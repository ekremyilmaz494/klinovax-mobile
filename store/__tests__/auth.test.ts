import { clearLastUnlockAt } from '@/lib/auth/biometric-policy';
import { clearMustChangePassword, clearSession, saveSession } from '@/lib/auth/secure-token';
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
  clearMustChangePassword: jest.fn(async () => {}),
}));

const TEST_USER = {
  id: 'u1',
  email: 'a@b.com',
  role: 'staff' as const,
  organizationId: 'o1',
  organizationSlug: 'org',
};

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

  it('logout mustChangePassword bayrağını da sıfırlar', async () => {
    await useAuthStore.getState().setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: TEST_USER,
      mustChangePassword: true,
    });
    expect(useAuthStore.getState().mustChangePassword).toBe(true);
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });
});

describe('auth store — mustChangePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setSession bayrağı persist eder ve state’e yazar', async () => {
    await useAuthStore.getState().setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: TEST_USER,
      mustChangePassword: true,
    });
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
    expect(useAuthStore.getState().mustChangePassword).toBe(true);
  });

  it('clearMustChange secure-store bayrağını siler ve state’i kapatır', async () => {
    await useAuthStore.getState().setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: TEST_USER,
      mustChangePassword: true,
    });
    await useAuthStore.getState().clearMustChange();
    expect(clearMustChangePassword).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });

  it('mustChangePassword olmadan setSession bayrağı false bırakır', async () => {
    await useAuthStore
      .getState()
      .setSession({ accessToken: 'a', refreshToken: 'r', user: TEST_USER });
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });
});
