import * as SecureStore from 'expo-secure-store'

const LAST_UNLOCK_KEY = 'klinovax.lastUnlockAt'

/**
 * Son başarılı biometric doğrulamasının zaman damgası — eğer
 * "X dakika geçti, tekrar sor" stratejisi seçilirse kullanılır.
 */
export async function getLastUnlockAt(): Promise<number | null> {
  const v = await SecureStore.getItemAsync(LAST_UNLOCK_KEY)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function setLastUnlockAt(ms: number): Promise<void> {
  await SecureStore.setItemAsync(LAST_UNLOCK_KEY, String(ms))
}

export async function clearLastUnlockAt(): Promise<void> {
  await SecureStore.deleteItemAsync(LAST_UNLOCK_KEY)
}

/**
 * Strateji: GÜNDE BİR — gün değiştiyse biometric prompt göster.
 * Aynı gün içinde uygulama tekrar açılırsa kilit ekranı atlanır.
 *
 * "Gün" yerel saatte takvim günü (toDateString). Sağlık personeli mesai
 * boyunca uygulamayı 5-10 kez açıp kapatabilir; her seferinde Face ID
 * sorması rahatsız edici. Risk: yatak başı kalmış telefon — kabul edilen
 * trade-off, çünkü cihaz lock screen'i zaten Face ID kapısının arkasında.
 */
export async function shouldPromptBiometric(): Promise<boolean> {
  const last = await getLastUnlockAt()
  if (!last) return true
  return new Date(last).toDateString() !== new Date().toDateString()
}
