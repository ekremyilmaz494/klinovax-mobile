import * as LocalAuthentication from 'expo-local-authentication'

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])
  return hasHardware && isEnrolled
}

/**
 * Native biometric prompt'u açar. Başarı: true. Reddedilirse / iptal edilirse / cihaz biometric desteklemiyorsa: false.
 */
export async function promptBiometric(reason = 'Klinovax oturumunuzu açın'): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'İptal',
    fallbackLabel: 'Şifreyle gir',
    disableDeviceFallback: false,
  })
  return res.success
}
