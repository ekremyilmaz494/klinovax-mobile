import { API_BASE_URL } from '../config'
import { loadSession, updateAccessToken, clearSession } from '../auth/secure-token'

/**
 * Backend API client — bearer token, 401'de tek seferlik refresh + retry.
 *
 * Refresh akışı:
 *   1) İstek 401 dönerse, /api/auth/refresh çağrılır (refresh token ile).
 *   2) Yeni access+refresh token secure-store'a yazılır.
 *   3) Orijinal istek YENİ token ile bir kez tekrar denenir.
 *   4) Refresh de fail ederse session temizlenir, çağrıyı yapan logout'a düşürür.
 *
 * Eş zamanlı 401'lerde tek bir refresh promise paylaşılır (refreshInflight) —
 * 5 paralel istek 401 alıyorsa 5 refresh çağrısı yapılmaz, hepsi tek refresh'i bekler.
 */
let refreshInflight: Promise<string | null> | null = null

async function performRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      session?: { accessToken: string; refreshToken: string }
    }
    if (!data.session?.accessToken || !data.session.refreshToken) return null
    await updateAccessToken(data.session.accessToken, data.session.refreshToken)
    return data.session.accessToken
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(typeof body === 'object' && body && 'error' in body ? String((body as { error: unknown }).error) : `HTTP ${status}`)
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await loadSession()
  if (!session) throw new ApiError(401, { error: 'Oturum yok' })

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  }

  let res = await doFetch(session.accessToken)

  if (res.status === 401) {
    if (!refreshInflight) {
      refreshInflight = performRefresh(session.refreshToken).finally(() => {
        refreshInflight = null
      })
    }
    const newToken = await refreshInflight
    if (!newToken) {
      await clearSession()
      throw new ApiError(401, { error: 'Oturum süreniz doldu' })
    }
    res = await doFetch(newToken)
  }

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!res.ok) throw new ApiError(res.status, body ?? { error: `HTTP ${res.status}` })
  return body as T
}

/**
 * Login — auth gerektirmeyen public endpoint. apiFetch'i kullanmaz çünkü o
 * stored session'ı varsayar.
 */
export async function loginRequest(params: {
  email: string
  password: string
  rememberMe: boolean
}): Promise<{
  user: { id: string; email: string; role: string }
  organizationId: string | null
  organizationSlug: string | null
  session: { accessToken: string; refreshToken: string; expiresAt: number | null; tokenType: string } | null
  mustChangePassword: boolean
  setupCompleted: boolean | null
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!res.ok) throw new ApiError(res.status, body ?? { error: `HTTP ${res.status}` })
  return body as Awaited<ReturnType<typeof loginRequest>>
}
