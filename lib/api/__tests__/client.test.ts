// Sabit base URL — config'in expo-constants zincirine girmesin.
import { onlineManager } from '@tanstack/react-query';

import { clearSession } from '@/lib/auth/secure-token';
import { ApiError, apiRequest, setOnAuthFailure } from '../client';

jest.mock('@/lib/config', () => ({ API_BASE_URL: 'https://api.test' }));

// secure-token — in-memory session + clearSession spy.
const mockSession = {
  current: {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    user: { id: 'u1' },
  } as { accessToken: string; refreshToken: string; user: { id: string } } | null,
};
jest.mock('@/lib/auth/secure-token', () => ({
  loadSession: jest.fn(async () => mockSession.current),
  updateAccessToken: jest.fn(async () => {}),
  clearSession: jest.fn(async () => {
    mockSession.current = null;
  }),
}));

const mockClearSession = clearSession as jest.MockedFunction<typeof clearSession>;

/** Hızlı Response factory'si. */
function makeResponse(status: number, body: unknown = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const realFetch = global.fetch;

beforeEach(() => {
  mockSession.current = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    user: { id: 'u1' },
  };
  setOnAuthFailure(null);
});

afterEach(() => {
  global.fetch = realFetch;
});

describe('apiRequest — Bearer header', () => {
  it('isteğe geçerli access token Bearer header olarak eklenir', async () => {
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => makeResponse(200));
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiRequest('/api/x');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-1');
  });
});

describe('apiRequest — gerçeklik geri bildirimi (onlineManager)', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("onlineManager offline iken HTTP yanıtı gelirse online'a çekilir", async () => {
    // iOS Simulator stuck-reachability senaryosu: NetInfo yanlışlıkla offline dedi
    // ama gerçek istekler çalışıyor — başarılı yanıt heuristik tahmini ezer.
    onlineManager.setOnline(false);
    global.fetch = jest.fn(async () => makeResponse(200)) as unknown as typeof fetch;

    await apiRequest('/api/x');

    expect(onlineManager.isOnline()).toBe(true);
  });

  it("hata status'lü (500) yanıt bile online sinyalidir — ağ çalışıyor demektir", async () => {
    onlineManager.setOnline(false);
    global.fetch = jest.fn(async () =>
      makeResponse(500, { error: 'boom' }),
    ) as unknown as typeof fetch;

    await apiRequest('/api/x').catch(() => {});

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('fetch network hatasıyla reject ederse online durumu değişmez', async () => {
    onlineManager.setOnline(false);
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    await apiRequest('/api/x').catch(() => {});

    expect(onlineManager.isOnline()).toBe(false);
  });
});

describe('apiRequest — 401 refresh + retry', () => {
  it('401 → tek refresh → yeni token ile retry başarılı', async () => {
    const calls: string[] = [];
    const fetchMock = jest.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/api/auth/refresh')) {
        return makeResponse(200, {
          session: { accessToken: 'access-2', refreshToken: 'refresh-2' },
        });
      }
      // İlk çağrı 401, retry 200.
      const isRetry = calls.filter((c) => c.endsWith('/api/x')).length > 1;
      return makeResponse(isRetry ? 200 : 401);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await apiRequest('/api/x');
    expect(res.status).toBe(200);
    // 1) ilk istek 401, 2) refresh, 3) retry → 3 fetch
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(calls.filter((c) => c.endsWith('/api/auth/refresh'))).toHaveLength(1);
  });

  it('eşzamanlı iki 401 → refresh endpoint SADECE 1 kez çağrılır (single-flight)', async () => {
    let refreshCount = 0;
    let firstTwo401 = 0;
    global.fetch = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/refresh')) {
        refreshCount += 1;
        // Microtask gecikmesi: ikinci 401 inflight refresh'i paylaşsın.
        await Promise.resolve();
        return makeResponse(200, {
          session: { accessToken: 'access-2', refreshToken: 'refresh-2' },
        });
      }
      // Eski token (access-1) ile ilk iki çağrı 401; refresh sonrası retry 200.
      const token = (init?.headers as Headers | undefined)?.get('Authorization');
      if (token === 'Bearer access-1' && firstTwo401 < 2) {
        firstTwo401 += 1;
        return makeResponse(401);
      }
      return makeResponse(200);
    }) as unknown as typeof fetch;

    const [r1, r2] = await Promise.all([apiRequest('/api/a'), apiRequest('/api/b')]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refreshCount).toBe(1);
  });

  it("refresh, request başında yakalanan değil store'daki EN TAZE refresh-token'ı kullanır (rotasyon yarışı → yanlış logout yok)", async () => {
    mockSession.current = {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'u1' },
    };
    let usedRefreshToken: string | null = null;
    global.fetch = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/refresh')) {
        usedRefreshToken = JSON.parse((init?.body as string) ?? '{}').refreshToken;
        return makeResponse(200, {
          session: { accessToken: 'access-9', refreshToken: 'refresh-9' },
        });
      }
      const auth = (init?.headers as Headers | undefined)?.get('Authorization');
      if (auth === 'Bearer access-1') {
        // İlk istek 401 dönerken, "başka bir istek" (A) store'daki token'ı rotate etmiş olsun.
        mockSession.current = {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          user: { id: 'u1' },
        };
        return makeResponse(401);
      }
      return makeResponse(200);
    }) as unknown as typeof fetch;

    const res = await apiRequest('/api/x');
    expect(res.status).toBe(200);
    // Bayat refresh-1 DEĞİL, store'daki güncel refresh-2 ile refresh edilmeli.
    expect(usedRefreshToken).toBe('refresh-2');
  });
});

describe('apiRequest — refresh fail', () => {
  it('refresh auth-fail (!res.ok) → clearSession + onAuthFailure + 401 throw', async () => {
    const onAuthFailure = jest.fn();
    setOnAuthFailure(onAuthFailure);

    global.fetch = (async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) return makeResponse(401);
      return makeResponse(401);
    }) as unknown as typeof fetch;

    await expect(apiRequest('/api/x')).rejects.toMatchObject({ status: 401 });
    expect(mockClearSession).toHaveBeenCalled();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('refresh network-fail (fetch throw) → session korunur + ApiError(0) throw', async () => {
    const onAuthFailure = jest.fn();
    setOnAuthFailure(onAuthFailure);

    global.fetch = (async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) throw new TypeError('Network request failed');
      return makeResponse(401);
    }) as unknown as typeof fetch;

    await expect(apiRequest('/api/x')).rejects.toMatchObject({ status: 0 });
    // Offline'da zorla logout YOK — session korunur, callback çağrılmaz.
    expect(mockClearSession).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(mockSession.current).not.toBeNull();
  });
});

describe('ApiError', () => {
  it('body.error mesajı Error.message olur', () => {
    expect(new ApiError(400, { error: 'Geçersiz' }).message).toBe('Geçersiz');
  });

  it('error alanı yoksa HTTP status mesajı', () => {
    expect(new ApiError(503, {}).message).toBe('HTTP 503');
  });
});
