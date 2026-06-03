import { useColorScheme as useSystemColorScheme } from 'react-native';

import { resolveColorScheme, useThemePreference } from '@/lib/theme/use-theme-preference';

/**
 * Efektif renk şeması — kullanıcı tercihi ('system'|'light'|'dark') ile cihaz
 * görünümünü birleştirir. Tüm tema (useTheme, navTheme, StatusBar, primitive'ler)
 * tek noktadan bunu okur; tercih değişince uygulama anında yeni temaya geçer.
 */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const { preference } = useThemePreference();
  return resolveColorScheme(preference, system);
}
