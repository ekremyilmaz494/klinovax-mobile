import { onlineManager } from '@tanstack/react-query';

import { API_BASE_URL } from '../config';
import { loadSession, updateAccessToken, clearSession } from '../auth/secure-token';

/**
 * fetch wrapper'ı — fetch promise'i network hatasıyla reject ederse anlamlı bir
 * ApiError fırlat. Default `TypeError: Network request failed` mesajı kullanıcıya
 * "Bağlantı hatası" gibi belirsiz görünüyor.
 *
 * Mesaj ayrımı: dev'de API URL + teknik sebep (geliştirici hangi adrese
 * bağlanamadığını anında görsün), prod'da personel dostu Türkçe metin —
 * hastane personeline "backend kapalı olabilir" / URL gösterilmez.
 */
async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, init);
    // GERÇEKLİK GERİ BİLDİRİMİ: HTTP yanıtı geldiyse (status ne olursa olsun) ağ
    // ÇALIŞIYOR demektir. NetInfo/iOS Simulator yanlışlıkla "offline" raporlasa bile
    // (bilinen stuck-reachability bug'ı) onlineManager'ı düzelt — aksi halde TanStack
    // sorguları duraklı kalır ve ekranlar sonsuza dek boş görünür. Gerçek istek
    // sonucu her zaman heuristik tahminden üstündür.
    if (!onlineManager.isOnline()) onlineManager.setOnline(true);
    return res;
  } catch {
    throw new ApiError(0, {
      error: __DEV__
        ? `Sunucuya ulaşılamadı (${API_BASE_URL}). Backend kapalı olabilir veya cihazınız bu adrese erişemiyor.`
        : 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.',
    });
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
type RefreshResult = { ok: true; token: string } | { ok: false; reason: 'network' | 'auth' };

let refreshInflight: Promise<RefreshResult> | null = null;

async function performRefresh(): Promise<RefreshResult> {
  // Refresh token'ı çağrı ANINDA store'dan oku — apiRequest başında yakalanan değer,
  // eşzamanlı başka bir isteğin (A) rotasyonundan sonra BAYAT olabilir. Bayat token'la
  // refresh → backend reddi → reason:'auth' → yanlış logout (eşzamanlı 401 yarışı: B'nin
  // 401'i A'nın inflight'ı temizlendikten sonra gelir). A yeni refresh-token'ı inflight'ı
  // temizlemeden ÖNCE store'a yazdığı için, burada okunan token her zaman en günceldir.
  // Tek-inflight guard korunur: bu fonksiyon refreshInflight set'inden SONRA çağrılır,
  // 401 ile inflight kontrolü arasına await EKLENMEZ.
  const session = await loadSession();
  if (!session?.refreshToken) return { ok: false, reason: 'auth' };
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  if (!res.ok) return { ok: false, reason: 'auth' };
  try {
    const data = (await res.json()) as { session?: { accessToken: string; refreshToken: string } };
    if (!data.session?.accessToken || !data.session.refreshToken)
      return { ok: false, reason: 'auth' };
    await updateAccessToken(data.session.accessToken, data.session.refreshToken);
    accessTokenListener?.(data.session.accessToken);
    return { ok: true, token: data.session.accessToken };
  } catch {
    return { ok: false, reason: 'auth' };
  }
}

/**
 * Auth failure callback — refresh AUTH ile fail ettiğinde tetiklenir.
 * `app/_layout.tsx` Zustand store'un logout'unu burada register eder; bu sayede
 * SecureStore + Zustand store senkron temizlenir, AuthGate login'e redirect.
 *
 * Network fail durumunda çağrılmaz (kullanıcıyı offline'da zorla logout etmeyiz).
 */
let onAuthFailure: (() => void | Promise<void>) | null = null;
export function setOnAuthFailure(cb: (() => void | Promise<void>) | null): void {
  onAuthFailure = cb;
}

/**
 * Access token listener — refresh AUTH başarılı olduğunda yeni token ile çağrılır.
 * Zustand auth store bu sayede memory-cache'i sync tutar; video player gibi tüketiciler
 * AppState resume'da SecureStore okumadan güncel token'a erişir.
 */
let accessTokenListener: ((token: string) => void) | null = null;
export function setAccessTokenListener(cb: ((token: string) => void) | null): void {
  accessTokenListener = cb;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    /** 429'da `Retry-After` header'ından saniye (yoksa null) — UI "X sn sonra dene" için. */
    public retryAfter: number | null = null,
  ) {
    super(
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${status}`,
    );
  }
}

/**
 * 429 `Retry-After` header'ını saniyeye çevirir. RFC 7231: ya delay-seconds
 * (tam sayı) ya da HTTP-date. Geçersiz/eksik → null. `nowMs` dışarıdan verilir
 * (HTTP-date farkı deterministik test edilebilsin).
 */
export function parseRetryAfterSeconds(
  value: string | null | undefined,
  nowMs: number,
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  // delay-seconds dalını da üst sınırla (HTTP-date dalı zaten Math.max ile savunmacı):
  // bozuk/hostile 'Retry-After: 99999999999' UI countdown'ına saçma/taşkın değer akıtmasın
  // (32-bit timer sınırı: ~24.8 günden büyük setTimeout hemen tetiklenir). 24 saat tavanı.
  if (/^\d+$/.test(trimmed)) return Math.min(Number(trimmed), 86_400);
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, Math.ceil((dateMs - nowMs) / 1000));
}

/**
 * apiRequest — bearer + 401-refresh+retry; ham Response döner. JSON, blob, stream
 * gibi farklı içerikler bunun üzerinden tüketilebilir. apiFetch JSON için sarmalar.
 */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await loadSession();
  if (!session) throw new ApiError(401, { error: 'Oturum yok' });

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetchOrThrow(`${API_BASE_URL}${path}`, { ...init, headers });
  };

  let res = await doFetch(session.accessToken);

  if (res.status === 401) {
    if (!refreshInflight) {
      // Auth-fail temizliği (clearSession + onAuthFailure) refresh promise'inin
      // İÇİNDE yapılır: eş zamanlı N istek aynı inflight'i await ettiğinde yan
      // etki tek instance üzerinde TEK KEZ koşar — aksi halde her awaiter logout'u
      // tekrar tetikler (unregisterPushToken boşa gider, logout iki kez çalışır).
      refreshInflight = performRefresh()
        .then(async (result) => {
          if (!result.ok && result.reason === 'auth') {
            await clearSession();
            if (onAuthFailure) {
              try {
                await onAuthFailure();
              } catch (e) {
                console.warn('[apiRequest] onAuthFailure threw', e);
              }
            }
          }
          return result;
        })
        .finally(() => {
          refreshInflight = null;
        });
    }
    const result = await refreshInflight;
    if (!result.ok) {
      if (result.reason === 'network') {
        // Offline iken refresh denemesi başarısız oldu — session'a dokunma,
        // çağrı sahibine network hatası dön. Online'a dönünce yeniden denenir.
        throw new ApiError(0, {
          error: `Sunucuya ulaşılamadı (${API_BASE_URL}). Backend kapalı olabilir veya cihazınız bu adrese erişemiyor.`,
        });
      }
      // Auth hatası: temizlik yukarıda (inflight içinde) tek kez yapıldı.
      throw new ApiError(401, { error: 'Oturum süreniz doldu' });
    }
    res = await doFetch(result.token);
  }

  return res;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiRequest(path, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const retryAfter =
      res.status === 429
        ? parseRetryAfterSeconds(res.headers.get('retry-after'), Date.now())
        : null;
    throw new ApiError(res.status, body ?? { error: `HTTP ${res.status}` }, retryAfter);
  }
  return body as T;
}

/**
 * Login — auth gerektirmeyen public endpoint. apiFetch'i kullanmaz çünkü o
 * stored session'ı varsayar.
 */
export async function loginRequest(params: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<{
  user: { id: string; email: string; role: string };
  organizationId: string | null;
  organizationSlug: string | null;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
    tokenType: string;
  } | null;
  mustChangePassword: boolean;
  setupCompleted: boolean | null;
  // Gated yanıtlar (session YOK ile döner) — mobil bunları henüz akış olarak desteklemez,
  // login ekranı yalnız kullanıcıya doğru yönlendirici mesajı göstermek için okur.
  mfaRequired?: boolean;
  smsMfaRequired?: boolean;
  phoneMasked?: string | null;
  phoneMissing?: boolean;
  factorId?: string;
}> {
  const res = await fetchOrThrow(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, body ?? { error: `HTTP ${res.status}` });
  return body as Awaited<ReturnType<typeof loginRequest>>;
}
