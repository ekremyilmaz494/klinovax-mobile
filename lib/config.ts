import Constants from 'expo-constants'

/**
 * API base URL — dev'de localhost:3000, prod'da klinovax.com.
 * iOS Simulator localhost'u host makinenin localhost'u olarak görür; gerçek
 * cihazda local backend'e ulaşmak için Mac'in LAN IP'si lazım (örn.
 * EXPO_PUBLIC_API_URL=http://192.168.1.X:3000 ile env override).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:3000'
