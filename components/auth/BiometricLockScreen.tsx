import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { IconSymbol } from '@/components/ui/icon-symbol'
import { Button, Text, useTheme } from '@/design-system'
import { promptBiometric } from '@/lib/auth/biometric'
import { setLastUnlockAt, shouldPromptBiometric } from '@/lib/auth/biometric-policy'
import { useAuthStore } from '@/store/auth'

/**
 * Tüm tabs/ekranların ÜZERİNE binen tam ekran kilit. `auth.unlocked === false`
 * olduğunda _layout tarafında render edilir.
 *
 * - İlk render'da otomatik biometric prompt açılır.
 * - Kullanıcı reddeder/iptal ederse: "Tekrar dene" butonu + "Çıkış yap" alternatifi.
 *   Logout dışında uygulamaya giremezler.
 */
export function BiometricLockScreen() {
  const t = useTheme()
  const unlock = useAuthStore((s) => s.unlock)
  const logout = useAuthStore((s) => s.logout)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tryUnlock = async () => {
    setBusy(true)
    setError(null)
    try {
      const need = await shouldPromptBiometric()
      if (!need) {
        await setLastUnlockAt(Date.now())
        unlock()
        return
      }
      const ok = await promptBiometric('Klinovax\'a giriş')
      if (ok) {
        await setLastUnlockAt(Date.now())
        unlock()
      } else {
        setError('Doğrulama başarısız.')
      }
    } catch {
      setError('Beklenmeyen hata oluştu.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void tryUnlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SafeAreaView
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: t.colors.surface.canvas, zIndex: 999 },
      ]}
    >
      <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text variant="overline" tone="tertiary">
          BİYOMETRİK GİRİŞ
        </Text>
        <Text
          variant="display"
          align="center"
          italic
          style={{ color: t.colors.accent.clay, marginTop: 4, marginBottom: 4 }}
        >
          Klinovax
        </Text>
        <Text variant="subhead" tone="tertiary" align="center">
          Devam etmek için doğrulama gerekli
        </Text>

        <View
          style={{
            marginTop: 40,
            marginBottom: 24,
            height: 96,
            width: 96,
            borderRadius: 48,
            backgroundColor: t.colors.accent.clayMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {busy ? (
            <ActivityIndicator color={t.colors.accent.clay} size="large" />
          ) : (
            <IconSymbol name="lock.fill" size={48} color={t.colors.accent.clay} />
          )}
        </View>

        {error ? (
          <Text variant="footnote" tone="danger" align="center" style={{ marginBottom: 8 }}>
            {error}
          </Text>
        ) : null}

        <View style={{ gap: 12, alignItems: 'stretch', minWidth: 240 }}>
          <Button
            label={busy ? 'Doğrulanıyor…' : 'Tekrar Dene'}
            variant="primary"
            size="lg"
            onPress={() => void tryUnlock()}
            disabled={busy}
            fullWidth
          />
          <Button
            label="Çıkış Yap"
            variant="ghost"
            onPress={() => void logout()}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  )
}
