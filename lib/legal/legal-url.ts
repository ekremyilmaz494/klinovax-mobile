import { API_BASE_URL } from '@/lib/config';

/** Yasal metin slug → başlık. ALLOWED kontrolü de bu anahtarlardan türer. */
export const LEGAL_TITLES: Record<string, string> = {
  kvkk: 'KVKK Aydınlatma Metni',
  terms: 'Kullanım Koşulları',
  privacy: 'Gizlilik Politikası',
};

export type LegalSlug = keyof typeof LEGAL_TITLES;

/** Bilinmeyen slug'ı kvkk'ya düşürerek güvenli yasal URL üret. */
export function legalUrl(slug: string): string {
  const safe = LEGAL_TITLES[slug] ? slug : 'kvkk';
  return `${API_BASE_URL}/${safe}`;
}

/**
 * Gömülü WebView için navigation lock (deep-link fallback ekranında kullanılır).
 * Aynı yasal sayfaya (aynı origin + aynı path) izin verir; query/hash farkları
 * (Next.js client nav, #anchor, ?bare=1) serbest. Başka sayfalar (login, başka
 * slug, dış site) engellenir.
 *
 * Önceki tam-string eşleşmesi trailing-slash/query varyasyonunda MEŞRU yüklemeyi
 * de blokluyordu → boş sayfa. Bu yüzden path-bazlı, normalize edilmiş karşılaştırma.
 */
export function isAllowedLegalUrl(baseUrl: string, url: string | null | undefined): boolean {
  if (!url) return true;
  if (/^(about:|data:|blob:)/i.test(url)) return true;
  const strip = (u: string) => u.split('#')[0].split('?')[0].replace(/\/+$/, '');
  return strip(url) === strip(baseUrl);
}
