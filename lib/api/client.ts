import { API_BASE_URL } from '../config'
import { loadSession, updateAccessToken, clearSession } from '../auth/secure-token'

/**
 * fetch wrapper'ı — fetch promise'i network hatasıyla reject ederse anlamlı bir
 * ApiError fırlat. Default `TypeError: Network request failed` mesajı kullanıcıya
 * "Bağlantı hatası" gibi belirsiz görünüyor; bunun yerine somut sebep söyleriz.
 */
async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new ApiError(0, {
      error: `Sunucuya ulaşılamadı (${API_BASE_URL}). Backend kapalı olabilir veya cihazınız bu adrese erişemiyor.`,
    })
  }
}

/**
 * Backend API client — bearer token, 401'de tek seferlik refresh + retry.
 *
 * Refresh akışı:
 *   1) İstek 401 dönerse, /api/auth/refresh çağrılır (refresh token ile).
 *   2) Yeni access+refresh token secure-store'a yazılır.
 *   3) Orijinal istek YENİ token ile bir kez tekrar denenir.
 *   4) Refresh AUTH hatasıyla fail ederse session temizlenir + onAuthFailure
 *      callback'i (Zustand logout) çağrılır.
 *   5) Refresh NETWORK hatasıyla fail ederse session korunur — kullanıcı
 *      offline iken zorla logout etmeyiz; çağrı sahibine network hatası bubble.
 *
 * Eş zamanlı 401'lerde tek bir refresh promise paylaşılır (refreshInflight) —
 * 5 paralel istek 401 alıyorsa 5 refresh çağrısı yapılmaz, hepsi tek refresh'i bekler.
 */
type RefreshResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'network' | 'auth' }

let refreshInflight: Promise<RefreshResult> | null = null

async function performRefresh(refreshToken: string): Promise<RefreshResult> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return { ok: false, reason: 'network' }
  }
  if (!res.ok) return { ok: false, reason: 'auth' }
  try {
    const data = (await res.json()) as { session?: { accessToken: string; refreshToken: string } }
    if (!data.session?.accessToken || !data.session.refreshToken) return { ok: false, reason: 'auth' }
    await updateAccessToken(data.session.accessToken, data.session.refreshToken)
    return { ok: true, token: data.session.accessToken }
  } catch {
    return { ok: false, reason: 'auth' }
  }
}

/**
 * Auth failure callback — refresh AUTH ile fail ettiğinde tetiklenir.
 * `app/_layout.tsx` Zustand store'un logout'unu burada register eder; bu sayede
 * SecureStore + Zustand store senkron temizlenir, AuthGate login'e redirect.
 *
 * Network fail durumunda çağrılmaz (kullanıcıyı offline'da zorla logout etmeyiz).
 */
let onAuthFailure: (() => void | Promise<void>) | null = null
export function setOnAuthFailure(cb: (() => void | Promise<void>) | null): void {
  onAuthFailure = cb
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(typeof body === 'object' && body && 'error' in body ? String((body as { error: unknown }).error) : `HTTP ${status}`)
  }
}

/**
 * apiRequest — bearer + 401-refresh+retry; ham Response döner. JSON, blob, stream
 * gibi farklı içerikler bunun üzerinden tüketilebilir. apiFetch JSON için sarmalar.
 */
export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = await loadSession()
  if (!session) throw new ApiError(401, { error: 'Oturum yok' })

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetchOrThrow(`${API_BASE_URL}${path}`, { ...init, headers })
  }

  let res = await doFetch(session.accessToken)

  if (res.status === 401) {
    if (!refreshInflight) {
      refreshInflight = performRefresh(session.refreshToken).finally(() => {
        refreshInflight = null
      })
    }
    const result = await refreshInflight
    if (!result.ok) {
      if (result.reason === 'network') {
        // Offline iken refresh denemesi başarısız oldu — session'a dokunma,
        // çağrı sahibine network hatası dön. Online'a dönünce yeniden denenir.
        throw new ApiError(0, {
          error: `Sunucuya ulaşılamadı (${API_BASE_URL}). Backend kapalı olabilir veya cihazınız bu adrese erişemiyor.`,
        })
      }
      // Auth hatası: session temizle + onAuthFailure (Zustand logout) tetikle
      await clearSession()
      if (onAuthFailure) {
        try { await onAuthFailure() } catch (e) { console.warn('[apiRequest] onAuthFailure threw', e) }
      }
      throw new ApiError(401, { error: 'Oturum süreniz doldu' })
    }
    res = await doFetch(result.token)
  }

  return res
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await apiRequest(path, init)
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
  const res = await fetchOrThrow(`${API_BASE_URL}/api/auth/login`, {
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
