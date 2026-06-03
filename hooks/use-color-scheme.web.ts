import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { resolveColorScheme, useThemePreference } from '@/lib/theme/use-theme-preference';

/**
 * Web: statik render için değer client'ta yeniden hesaplanmalı (hydration guard).
 * Hydrate olana dek 'light'; sonrasında kullanıcı tercihi + cihaz şeması.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useRNColorScheme();
  const { preference } = useThemePreference();

  if (!hasHydrated) return 'light';
  return resolveColorScheme(preference, system);
}
