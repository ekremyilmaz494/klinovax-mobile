import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ColorSchemeName } from 'react-native';

/**
 * Kullanıcının tema tercihi. 'system' → cihaz görünümünü takip et; 'light'/'dark'
 * → cihazı yok say, sabitle. Profil ekranındaki seçiciden değişir, AsyncStorage'a
 * kaydedilir. `@/hooks/use-color-scheme` bu tercihi okuyup tüm temayı besler.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'klinovax-theme-preference-v1';

/**
 * Tercih + cihaz şemasından efektif renk şemasını çöz. Saf fonksiyon (test edilir,
 * provider dışında da çağrılabilir). 'system'de cihaz null/undefined dönerse
 * (heuristik henüz çalışmadı) güvenli varsayılan: light.
 */
export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
};

// Provider dışında (web statik render / test) güvenli varsayılan: 'system' + no-op.
const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: 'system',
  setPreference: () => {},
});

export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Kalıcı tercihi yükle (bir kez). Yüklenene kadar 'system' — kısa, splash arkasında
  // olur, kullanıcı flash görmez. Okuma hatasında varsayılanda kalınır.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // Önce state (UI anında geçsin), sonra fire-and-forget persist.
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}
