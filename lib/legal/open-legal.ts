import * as WebBrowser from 'expo-web-browser';

import { legalUrl } from './legal-url';

/**
 * Yasal metni sistemin in-app tarayıcısında aç (Android Chrome Custom Tabs /
 * iOS SafariViewController).
 *
 * NEDEN gömülü react-native-webview yerine bu: WebView Android'de render süreci
 * ölünce (onRenderProcessGone) host uygulamayı KOMPLE çökertiyordu ("Klinovax
 * sürekli olarak duruyor"). Custom Tabs kendi sürecinde çalışır, kendi kapatma
 * butonu vardır, uygulamayı çökertemez ve takılmaz. Kullanıcı kapatınca uygulamaya
 * döner — harici Chrome'a tam çıkış değil, overlay.
 */
export async function openLegal(
  slug: string,
  colors: { toolbar: string; controls: string },
): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(legalUrl(slug), {
      toolbarColor: colors.toolbar,
      controlsColor: colors.controls,
      dismissButtonStyle: 'close',
    });
  } catch {
    // openBrowserAsync çok nadiren reddeder (örn. eşzamanlı çağrı); sessiz geç —
    // kullanıcı yine uygulamada kalır, çökme/dead-end yok.
  }
}
