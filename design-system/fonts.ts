import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { Platform } from 'react-native';

export const FontMap = {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
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
  displayMedium: 'Fraunces_500Medium',
  displayRegular: 'Fraunces_400Regular',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'InterTight_400Regular',
  bodyMedium: 'InterTight_500Medium',
  bodySemibold: 'InterTight_600SemiBold',
  bodyBold: 'InterTight_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

export type FontFamilyKey = keyof typeof FontFamily;
