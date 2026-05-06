import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api/client';

/**
 * Klinovax push notification servisi.
 *
 * Akış:
 * 1) `registerForPushNotifications()` — iznni kontrol et, gerekirse iste,
 *    Expo push token al, backend'e POST. Login sonrası ve uygulama açılışında
 *    AuthGate tetikler.
 * 2) `unregisterPushToken()` — logout'ta backend'den sil. Local'de saklamıyoruz
 *    (token Notifications API'den her zaman tekrar alınabilir).
 *
 * Hata stratejisi: tüm push işlemleri SESSİZ (silent) — login akışını ya da
 * çıkışı bloklamamalı. Loglar dev console'da görünür, kullanıcıya yansımaz.
 */

const PUSH_TOKEN_KEY = 'klinovax.expoPushToken';

let cachedToken: string | null = null;

async function getStoredPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  return cachedToken;
}

async function setStoredPushToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function clearStoredPushToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

/**
 * Cihazdan Expo push token'ı al + backend'e kaydet.
 * Başarılıysa token'ı döner; izin reddedilir veya simulator/emulator ise null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Simulator/emulator gerçek push almaz — Apple sınırı (iOS), benzer Android
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[push] Simulator/emulator — token alınamaz');
    return null;
  }

  try {
    // 1. İzin durumu kontrol et
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      if (__DEV__) console.warn('[push] Bildirim izni verilmedi:', finalStatus);
      return null;
    }

    // 2. Android channel'ı yaratmak gerek (iOS otomatik)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Klinovax Bildirimler',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9668',
      });
    }

    // 3. Expo push token al — projectId zorunlu (EAS Build sonrası app config'ten gelir)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      if (__DEV__) console.warn('[push] EAS projectId yok — `eas init` sonrası push çalışacak');
      return null;
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResp.data;
    if (!token) return null;

    // 4. Backend'e kaydet (aynı token'ı tekrar gönderse bile upsert ile zarar yok)
    if ((await getStoredPushToken()) === token) return token;
    await apiFetch('/api/staff/push/expo/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: Device.deviceName ?? undefined,
      }),
    });
    await setStoredPushToken(token);
    return token;
  } catch (err) {
    if (__DEV__) console.warn('[push] Register hatası:', err);
    return null;
  }
}

/**
 * Backend'den push token'ı sil — logout akışında çağrılır.
 * Local cache'i de temizler.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = await getStoredPushToken();
  if (!token) return;
  await clearStoredPushToken();
  try {
    await apiFetch('/api/staff/push/expo/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    if (__DEV__) console.warn('[push] Unregister hatası:', err);
    // Sessiz geç — logout flow'unu bloklamamalı
  }
}
