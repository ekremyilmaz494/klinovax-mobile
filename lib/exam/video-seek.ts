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
  return Math.min(Math.max(0, targetSeconds), currentSeconds);
}
