import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android donanım geri tuşunu ekran focused iken yakala.
 *
 * iOS'ta `gestureEnabled: false` + `headerLeft: null` ile çıkış kapatılan
 * ekranlarda Android donanım back hâlâ `router.back()` tetikler — bu hook
 * onu engeller. Handler `true` döndürürse default davranış bypass edilir.
 *
 * iOS'ta no-op: BackHandler event hiçbir zaman tetiklenmez ama register
 * güvenli (cross-platform sade tutmak için).
 */
export function useAndroidBackGuard(handler: () => boolean) {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', handler);
      return () => sub.remove();
    }, [handler]),
  );
}
