import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ApiError, apiRequest } from './client';

/**
 * Sertifika PDF'ini /api/certificates/:id/pdf'ten indirip cache'e yazar.
 * Aynı sertifika tekrar açıldığında üzerine yazıyoruz; backend'de logo /
 * expire / iptal değişmiş olabilir, cache'lemeyi backend HTTP header'larına
 * bırakıyoruz (Cache-Control: private, max-age=3600).
 */
export async function cacheCertificatePdf(params: {
  id: string;
  certificateCode: string;
}): Promise<string> {
  const res = await apiRequest(`/api/certificates/${params.id}/pdf`);
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body ?? { error: 'PDF indirilemedi' });
  }

  const buffer = await res.arrayBuffer();
  const fileName = `sertifika-${params.certificateCode}.pdf`;
  const file = new File(Paths.cache, fileName);
  await file.create({ overwrite: true });
  await file.write(new Uint8Array(buffer));
  return file.uri;
}

/**
 * PDF'i indir + iOS/Android share sheet aç. Files'a Kaydet, AirDrop, Mail,
 * WhatsApp seçenekleri burada. Kullanıcının "indir" niyeti de bu yoldan,
 * çünkü iOS'ta bağımsız bir Downloads klasörü yok — share sheet > Files.
 */
export async function shareCertificatePdf(params: {
  id: string;
  certificateCode: string;
}): Promise<void> {
  const uri = await cacheCertificatePdf(params);
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Sertifikayı Paylaş',
    UTI: 'com.adobe.pdf',
  });
}
