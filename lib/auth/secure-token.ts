import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'klinovax.accessToken'
const REFRESH_KEY = 'klinovax.refreshToken'
const USER_KEY = 'klinovax.user'

export type StoredUser = {
  id: string
  email: string
  role: 'staff' | 'admin' | 'super_admin'
  organizationId: string | null
  organizationSlug: string | null
}

export async function saveSession(params: {
  accessToken: string
  refreshToken: string
  user: StoredUser
}): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, params.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, params.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(params.user)),
  ])
}

export async function loadSession(): Promise<{
  accessToken: string
  refreshToken: string
  user: StoredUser
} | null> {
  const [accessToken, refreshToken, userRaw] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ])
  if (!accessToken || !refreshToken || !userRaw) return null
  try {
    return { accessToken, refreshToken, user: JSON.parse(userRaw) as StoredUser }
  } catch {
    // userRaw bozulmuş — temizle ki bir daha çağrıda null dönsün
    await clearSession()
    return null
  }
}

export async function updateAccessToken(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ])
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ])
}
