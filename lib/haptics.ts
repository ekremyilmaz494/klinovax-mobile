import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Dokunsal geri bildirim sarmalayıcısı — başarı/etkileşim anlarında hafif titreşim.
 *
 * NEDEN sarmalayıcı: çağrılar best-effort olmalı. Simülatörde/web'de ya da haptik
 * donanımı yokken `expo-haptics` sessizce çalışmaz; herhangi bir reddi yutarız ki
 * bir titreşim hatası asıl akışı (kutlama, cevap) ASLA bozmasın.
 *
 * expo-haptics zaten kurulu (native modül build'de mevcut) → JS-only, OTA. Gerçek
 * cihaz gerektirir; simülatörde no-op'tur.
 */

// Web'de expo-haptics no-op ama gereksiz çağrıyı baştan eler.
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Olumlu sonuç (sınav geçme, rozet kazanma) — belirgin başarı titreşimi. */
export function hapticSuccess(): void {
  if (!supported) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Hafif dokunuş (cevap seçimi, kart basışı) — kısa, ince geri bildirim. */
export function hapticLight(): void {
  if (!supported) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Uyarı (yanlış cevap, riskli durum) — dikkat çeken titreşim. */
export function hapticWarning(): void {
  if (!supported) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
