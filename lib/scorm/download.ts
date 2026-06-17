import { Directory, File, Paths } from 'expo-file-system';

import { ApiError, apiRequest } from '@/lib/api/client';
import { scormContentPath } from '@/lib/api/scorm';
import { API_BASE_URL } from '@/lib/config';

import { normalizeScormHref, parseScormFilePaths } from './manifest';

const MANIFEST = 'imsmanifest.xml';

export type ScormDownloadResult = {
  /** Yüklenecek başlangıç dosyasının file:// URI'si (WebView source). */
  entryUri: string;
  /** Paket kök dizininin file:// URI'si (iOS allowingReadAccessToURL). */
  baseDirUri: string;
};

/** Unmount'ta indirme döngüsünü kesmek için paylaşılan bayrak. */
export type DownloadSignal = { cancelled: boolean };

/**
 * SCORM paketini authenticated content route'tan cihaza indirir ve entry'nin
 * file:// URI'sini döndürür. WebView paketi yerelden yükleyince alt-kaynaklar
 * (js/css/görsel) auth gerektirmez — Bearer header taşımayan WebView istek sorunu çözülür.
 *
 * Her açılışta temiz indirir (yarım/eski paket tutarsızlığını önler). Paket
 * Paths.cache altında; OS depolama baskısında silebilir, sorun değil (yeniden inilir).
 *
 * Bilinçli sınır: yalnız imsmanifest.xml'de `<file href>` ile bildirilen dosyalar
 * inilir (bkz. parseScormFilePaths). Tekil dosya 404 olursa akış kesilmez.
 */
export async function downloadScormPackage(opts: {
  trainingId: string;
  entryPoint: string;
  token: string;
  signal?: DownloadSignal;
  onProgress?: (done: number, total: number) => void;
}): Promise<ScormDownloadResult> {
  const { trainingId, entryPoint, token, signal, onProgress } = opts;
  const headers = { Authorization: `Bearer ${token}` };

  const baseDir = new Directory(Paths.cache, 'scorm', trainingId);
  if (baseDir.exists) baseDir.delete();
  baseDir.create({ intermediates: true, idempotent: true });

  // 1) Manifest'i apiRequest ile al — File.downloadFileAsync 403/404'te status'süz
  //    generic Error fırlatıyordu; ekran `err instanceof ApiError` ile kalıcı/geçici
  //    ayrımı yaptığından erişim hatası (IDOR=403, paket yok=404) yanlışça "tekrar dene"
  //    gösteriliyordu. apiRequest doğru status'lü ApiError + 401 refresh sağlar.
  const manifestRes = await apiRequest(scormContentPath(trainingId, MANIFEST));
  if (!manifestRes.ok) {
    const retryAfter = Number(manifestRes.headers.get('retry-after')) || null;
    throw new ApiError(
      manifestRes.status,
      { error: `SCORM içeriğine erişilemedi (HTTP ${manifestRes.status})` },
      retryAfter,
    );
  }
  const xml = await manifestRes.text();
  // Diske de yaz: nadiren paket içeriği imsmanifest.xml'i relative referanslayabilir.
  const manifestFile = new File(baseDir, MANIFEST);
  manifestFile.create();
  manifestFile.write(xml);

  // 2) İndirilecek dosya listesi — entry point garanti listede.
  const files = parseScormFilePaths(xml);
  const entryNorm = normalizeScormHref(entryPoint);
  if (entryNorm && !files.includes(entryNorm)) files.unshift(entryNorm);

  // 3) Dizin yapısını koruyarak indir.
  let done = 0;
  for (const rel of files) {
    if (signal?.cancelled) throw new Error('İndirme iptal edildi');
    if (rel === MANIFEST) {
      done += 1;
      onProgress?.(done, files.length);
      continue;
    }
    const segments = rel.split('/');
    const fileName = segments.pop()!;
    const dir = segments.length ? new Directory(baseDir, ...segments) : baseDir;
    if (segments.length && !dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, fileName);
    const url = `${API_BASE_URL}${scormContentPath(trainingId, rel)}`;
    try {
      await File.downloadFileAsync(url, dest, { headers });
    } catch {
      // Tekil dosya inmezse akışı kesme — manifest'te olup S3'te eksik/opsiyonel olabilir.
    }
    done += 1;
    onProgress?.(done, files.length);
  }

  const entryRel = entryNorm ?? 'index.html';
  const entryFile = new File(baseDir, ...entryRel.split('/'));
  // Best-effort döngü tekil dosya hatalarını yutar (opsiyonel alt-kaynaklar S3'te
  // eksik olabilir). Ama ENTRY dosyası sessizce inmediyse (ör. token indirme sırasında
  // doldu) WebView kırık bir file:// yükler → kullanıcıya hata göstermeden boş ekran.
  // Açıkça doğrula: entry yoksa fırlat ki ekran "tekrar dene" hata UI'ı göstersin.
  if (!entryFile.exists) {
    throw new Error('SCORM başlangıç dosyası indirilemedi');
  }
  return { entryUri: entryFile.uri, baseDirUri: baseDir.uri };
}
