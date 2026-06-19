import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * AccessibilityInfo.isReduceMotionEnabled() async olduğundan ilk render(ler)de `false`
 * döner; gerçek tercih bir tick sonra gelir. Tekrarlayan animasyonlar (ProgressBar,
 * Aurora) `reduced` flip olunca effect ile kendini düzeltir. Mount'ta TEK SEFER koşan
 * animasyon eklersen, değer netleştikten sonra tekrar kontrol et — ilk frame'de
 * (Reduce Motion açık kullanıcıda) hareket görünebilir.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
