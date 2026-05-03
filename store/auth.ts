import { create } from 'zustand'

import { getBiometricEnabled } from '../lib/auth/biometric-flag'
import { type StoredUser, clearSession, loadSession, saveSession } from '../lib/auth/secure-token'
import { unregisterPushToken } from '../lib/notifications/push'

type AuthState = {
  user: StoredUser | null
  hydrated: boolean
  /**
   * Biometric kapısının arkasındaysak `false`. Token'ımız var ama henüz
   * Face ID / Touch ID ile doğrulamadık. Lock ekranı bu duruma göre çizilir.
   *
   * Flag YOKSA hydrate sonrası direkt `true` olur — biometric'i hiç açmamış
   * kullanıcıya kilit gelmez.
   */
  unlocked: boolean
  hydrate: () => Promise<void>
  setSession: (params: { accessToken: string; refreshToken: string; user: StoredUser }) => Promise<void>
  unlock: () => void
  lock: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  unlocked: true,
  hydrate: async () => {
    const [session, biometricEnabled] = await Promise.all([
      loadSession(),
      getBiometricEnabled(),
    ])
    set({
      user: session?.user ?? null,
      // session yok → unlocked irrelevant; session var + biometric flag açık → kilitli başla
      unlocked: !session ? true : !biometricEnabled,
      hydrated: true,
    })
  },
  setSession: async ({ accessToken, refreshToken, user }) => {
    await saveSession({ accessToken, refreshToken, user })
    // Yeni login = az önce şifreyle kanıtladı, kilit yok
    set({ user, unlocked: true })
  },
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
  logout: async () => {
    // Push token'ı session geçerliyken sil — clearSession sonrası bearer kalmadığı
    // için backend reddederdi. Hata olursa logout devam etsin ama sessiz kalmasın:
    // production'da log aggregator'a forensic ipucu olur (orphaned push token vakası).
    try {
      await unregisterPushToken()
    } catch (e) {
      console.warn('[auth.logout] unregisterPushToken failed', e)
    }
    await clearSession()
    set({ user: null, unlocked: true })
  },
}))
