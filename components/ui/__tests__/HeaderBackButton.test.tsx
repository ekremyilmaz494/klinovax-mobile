import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HeaderBackButton } from '@/components/ui/HeaderBackButton';

// iOS 26 + RNS 4.16 native back button bug'ının workaround'u: bu buton native
// back yerine geçtiği için davranışı (göster/gizle + back çağrısı) kilitlenmeli.
describe('HeaderBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router.canGoBack as jest.Mock).mockReturnValue(true);
  });

  it('history varken "Geri" etiketiyle render olur', () => {
    render(<HeaderBackButton />);
    expect(screen.getByText('Geri')).toBeTruthy();
  });

  it('basınca router.back() çağrılır', () => {
    render(<HeaderBackButton />);
    fireEvent.press(screen.getByLabelText('Geri dön'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('history yokken (stack ilk ekranı) hiçbir şey render etmez', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    render(<HeaderBackButton />);
    expect(screen.queryByText('Geri')).toBeNull();
  });

  it('özel etiket verilirse onu gösterir', () => {
    render(<HeaderBackButton label="Kapat" />);
    expect(screen.getByText('Kapat')).toBeTruthy();
  });
});
