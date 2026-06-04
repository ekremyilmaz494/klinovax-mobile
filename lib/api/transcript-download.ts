import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ApiError, apiRequest } from './client';

/**
 * Personel transkriptini (tüm tamamlanmış eğitimlerin PDF dökümü) backend'den
 * indirir. Backend `/api/staff/transcript/pdf` yalnızca PDF binary döner (JSON
 * varyantı yok); ad Content-Disposition'da gelir ama sabit bir dosya adı yeterli.
 *
 * Sertifika indirme (`cert-download.ts`) ile aynı desen: bearer'lı apiRequest →
 * arrayBuffer → cache'e yaz → share sheet. Cache'leme backend HTTP header'larına
 * bırakılır; her açılışta üzerine yazılır (içerik değişmiş olabilir).
 */
export async function shareTranscriptPdf(): Promise<void> {
  const res = await apiRequest('/api/staff/transcript/pdf');
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body ?? { error: 'Transkript indirilemedi' });
  }

  const buffer = await res.arrayBuffer();
  const file = new File(Paths.cache, 'transkript.pdf');
  await file.create({ overwrite: true });
  await file.write(new Uint8Array(buffer));

  // Sessiz dönüş "Hazırlanıyor…" sonrası butonu sessizce resetliyordu; çağıran
  // try/catch ile Alert gösterdiği için açık hata fırlat.
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Paylaşım bu cihazda kullanılamıyor.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Transkripti Paylaş',
    UTI: 'com.adobe.pdf',
  });
}
