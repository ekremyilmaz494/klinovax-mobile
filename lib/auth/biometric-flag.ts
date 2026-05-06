import * as SecureStore from 'expo-secure-store';

const FLAG_KEY = 'klinovax.biometricEnabled';

/**
 * Kullanıcının "Face ID / Touch ID ile giriş" tercihini SecureStore'da tutar.
 * Token'larla AYNI store'da, çünkü ikisi de aynı güvenlik perdesi (cihaz keychain).
 *
 * Not: bu sadece TERCİH bayrağıdır — kimlik doğrulama yine LocalAuthentication
 * ile yapılır. Bayrak true olduğu hâlde cihaz biometric desteklemiyorsa
 * AuthGate / login flow yumuşak fallback yapar (şifreyle giriş).
 */

export async function getBiometricEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(FLAG_KEY);
  return v === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(FLAG_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(FLAG_KEY);
  }
}
