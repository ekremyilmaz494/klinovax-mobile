/**
 * Video oynatıcı seek (sarma) saf mantığı — anti-cheat ileri sarma engeli.
 *
 * Ürün kuralı (2026-06-02, Ekrem): personel eğitim videosunu gerçekten izlemek
 * zorunda. İLERİ sarma yasak; GERİ sarma + duraklat/devam serbest. Bu kural iki
 * parça halinde uygulanır:
 *   1. videos.tsx `nativeControls={false}` — kaydırma çubuğu ve 10sn ileri butonu
 *      gibi native kontroller hiç gösterilmez (ileri sarma UI'ı yok).
 *   2. Bu clamp — kod üzerinden yapılacak her seek çağrısı da ileri gidemez.
 */

/**
 * Seek hedefini anti-cheat kuralına göre sınırla:
 *   - Hedef, mevcut konumun İLERİSİNDE olamaz (ileri sarma yasak)
 *   - Hedef 0'ın altına inemez (videonun başı)
 */
export function clampSeekTarget(currentSeconds: number, targetSeconds: number): number {
  // NaN koruması: Math.min/max NaN'ı YAYAR (clamp ETMEZ). current/target NaN ise
  // (player.currentTime metadata öncesi) anti-cheat tavanı kaybolup player.currentTime=NaN
  // yazılabilirdi. Sonlu değilse 0'a düşür. İLERİ-SARMA semantiği finite girişlerde DEĞİŞMEZ.
  const cur = Number.isFinite(currentSeconds) ? currentSeconds : 0;
  const tgt = Number.isFinite(targetSeconds) ? targetSeconds : 0;
  return Math.min(Math.max(0, tgt), cur);
}
