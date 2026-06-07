import { apiFetch } from './client';
import { scormAttemptSchema } from './schemas/scorm';
import { validate } from './schemas/index';
import type { ScormAttempt, ScormTrackingPatch } from '@/types/scorm';

/**
 * SCORM tracking çağrıları. KRİTİK: path parametresi **trainingId** (assignmentId
 * DEĞİL) — backend `/api/exam/[id]/scorm/*` route'ları `id`'yi doğrudan trainingId
 * olarak kullanır (scormAttempt where trainingId, training.findUnique by id).
 * Mobil eğitim-detay route param'ı (`trainings/[id]`) zaten trainingId.
 *
 * Web ile aynı endpoint'ler; mobil ekstra namespace yok.
 */

/** GET — en son SCORM attempt'i (resume: suspendData/lessonStatus). Hiç yoksa null. */
export async function fetchScormAttempt(trainingId: string): Promise<ScormAttempt | null> {
  const data = await apiFetch<ScormAttempt | null>(`/api/exam/${trainingId}/scorm/tracking`);
  return validate(scormAttemptSchema, data, 'scorm.attempt.get');
}

/** POST — yeni attempt oluştur (ilk açılış). Atama yoksa backend 403 döner. */
export async function createScormAttempt(trainingId: string): Promise<ScormAttempt> {
  const data = await apiFetch<ScormAttempt>(`/api/exam/${trainingId}/scorm/tracking`, {
    method: 'POST',
  });
  return validate(scormAttemptSchema, data, 'scorm.attempt.create') as ScormAttempt;
}

/**
 * PATCH — attempt'i güncelle. Yalnız gönderilen alanlar yazılır; lessonStatus
 * passed/completed olduğunda backend sertifikayı otomatik üretir.
 */
export async function patchScormAttempt(
  trainingId: string,
  body: ScormTrackingPatch,
): Promise<ScormAttempt> {
  const data = await apiFetch<ScormAttempt>(`/api/exam/${trainingId}/scorm/tracking`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return validate(scormAttemptSchema, data, 'scorm.attempt.patch') as ScormAttempt;
}

/**
 * SCORM içerik dosyasının API path'i (content route, `[...path]` catch-all).
 * Her segment encode edilir (boşluk/özel karakter güvenli); backend decode edip
 * `pathSegments.join('/')` ile S3 key'e çevirir. Mutlak URL için API_BASE_URL ekle.
 */
export function scormContentPath(trainingId: string, relativePath: string): string {
  const encoded = relativePath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `/api/exam/${trainingId}/scorm/content/${encoded}`;
}
