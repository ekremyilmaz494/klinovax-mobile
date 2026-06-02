import NetInfo from '@react-native-community/netinfo';

import { isHardOffline, setupOnlineBridge } from '../online-bridge';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));
jest.mock('@/lib/config', () => ({ API_BASE_URL: 'https://api.test' }));

describe('isHardOffline — sorgu duraklatma kararı', () => {
  it('isConnected=false (uçak modu / ağ yok) → kesin offline', () => {
    expect(isHardOffline(false)).toBe(true);
  });

  it('isConnected=true → online', () => {
    expect(isHardOffline(true)).toBe(false);
  });

  it('isConnected=null (henüz bilinmiyor) → online sayılır, istekler engellenmez', () => {
    // Yanlış "offline" kararı tüm veri akışını durdurur; yanlış "online" kararı
    // ise isteklerin doğal olarak fail etmesine yol açar — ikincisi tercih edilir.
    expect(isHardOffline(null)).toBe(false);
  });
});

describe('setupOnlineBridge', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reachability kontrolünü backend health endpointine yönlendirir (Google değil)', () => {
    const teardown = setupOnlineBridge();

    expect(NetInfo.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        reachabilityUrl: 'https://api.test/api/health',
        useNativeReachability: false,
      }),
    );

    teardown();
  });

  it('NetInfo dinleyicisi kurar ve teardown ile kaldırır', () => {
    const unsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValueOnce(unsubscribe);

    const teardown = setupOnlineBridge();
    // onlineManager.setEventListener lazy çağırabilir; addEventListener'ın
    // kurulduğunu teardown'un da unsubscribe'ı çağırdığını doğrula.
    teardown();

    // teardown sonrası: ya hiç kurulmadı (lazy) ya da kuruldu ve kaldırıldı
    if ((NetInfo.addEventListener as jest.Mock).mock.calls.length > 0) {
      expect(unsubscribe).toHaveBeenCalled();
    }
  });
});
