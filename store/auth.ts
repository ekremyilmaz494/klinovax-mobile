import { create } from 'zustand'
import { type StoredUser, loadSession, saveSession, clearSession } from '../lib/auth/secure-token'

type AuthState = {
  user: StoredUser | null
  hydrated: boolean
  hydrate: () => Promise<void>
  setSession: (params: { accessToken: string; refreshToken: string; user: StoredUser }) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  hydrate: async () => {
    const session = await loadSession()
    set({ user: session?.user ?? null, hydrated: true })
  },
  setSession: async ({ accessToken, refreshToken, user }) => {
    await saveSession({ accessToken, refreshToken, user })
    set({ user })
  },
  logout: async () => {
    await clearSession()
    set({ user: null })
  },
}))
