/**
 * imsmanifest.xml saf ayrıştırması — paketin TÜM dosyalarını (`<file href="...">`)
 * çıkarır. Mobil oynatıcı bu listeyi authenticated content route ile cihaza indirir;
 * WebView paketi file:// olarak yükleyince alt-kaynaklar yerelden gelir (auth yok).
 *
 * Bilinçli sınır: yalnız manifest'te listelenen dosyalar inilir. JS ile dinamik
 * (runtime) yüklenen, manifest'te olmayan asset'ler kapsanmaz — paketleyici tüm
 * statik dosyaları `<file>` altında bildirmiş olmalı (SCORM CAM beklentisi).
 */

/**
 * Bir href'i normalize eder: query/fragment atılır, URL-decode edilir.
 * Harici (http/https/protokol-bağımsız) veya path-traversal (`..`) içeren href
 * `null` döner — backend content route bunları zaten reddeder, indirmeye kalkma.
 */
export function normalizeScormHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  // Harici kaynak (CDN vb.) — pakete ait değil, atla.
  if (/^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('//')) return null;
  // Query/fragment dosya yolunun parçası değil.
  const pathOnly = trimmed.split(/[?#]/)[0];
  if (!pathOnly) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    decoded = pathOnly;
  }
  // Baştaki "./" ve "/" temizle (relative kalsın).
  const cleaned = decoded.replace(/^\.?\//, '');
  if (!cleaned || cleaned.split('/').some((seg) => seg === '..')) return null;
  return cleaned;
}

/**
 * Manifest XML'inden indirilecek benzersiz dosya yollarını (relative, decode'lu)
 * döndürür. Sıra korunur (ilk görülme), tekrarlar elenir.
 */
export function parseScormFilePaths(xml: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  // <file href="..."> veya <file ... href='...'> — tek/çift tırnak.
  const re = /<file\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const normalized = normalizeScormHref(m[2]);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
