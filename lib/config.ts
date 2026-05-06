import Constants from 'expo-constants';

/**
 * API base URL — production fallback `https://klinovax.com`.
 *
 * Çözünürlük sırası:
 *   1. `EXPO_PUBLIC_API_URL` env var  — EAS build profile'larında set edilir
 *      (development → local LAN IP, preview/production → klinovax.com).
 *      Lokal Metro'da `.env.local` ile override edilir.
 *   2. `Constants.expoConfig?.extra?.apiBaseUrl` — eski yol, geriye dönük tutulur
 *      (yeni `app.json` bu alanı taşımıyor; `extra` boş).
 *   3. `https://klinovax.com` — production fallback. Localhost yanıltıcıydı:
 *      preview/production build'inde env unutulursa app, prod URL'sine bağlanır
 *      ("backend kapalı" yerine doğru davranış).
 *
 * iOS Simulator'da localhost host makinenin localhost'unu görür; gerçek cihazda
 * lokal backend'e ulaşmak için Mac'in LAN IP'si gerekir (örn.
 * `EXPO_PUBLIC_API_URL=http://192.168.1.X:3000` ile env override).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://klinovax.com';
