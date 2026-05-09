import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { Platform } from 'react-native';

// 9 variant'tan 6'ya indirgendi: typography.ts ve direkt fontFamily kullanımları
// üzerinde kullanım analizi yapıldı; Fraunces_400Regular / _Italic / _500Medium
// hiçbir yerde tüketilmiyordu. Italic prop'u <Text> primitive'inde fontStyle:'italic'
// üzerinden çalıştığı için italic variant'ına gerek yok.
export const FontMap = {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
};

export const FontFamily = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'InterTight_400Regular',
  bodyMedium: 'InterTight_500Medium',
  bodySemibold: 'InterTight_600SemiBold',
  bodyBold: 'InterTight_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

export type FontFamilyKey = keyof typeof FontFamily;
