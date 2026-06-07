/**
 * SCORM 1.2 oynatıcı tipleri. Backend `ScormAttempt` modeli (web ile paylaşılan
 * /api/exam/[trainingId]/scorm/tracking) — trainingId + userId + organizationId
 * ile anahtarlı, assignment kavramı yok ("any period — SCORM legacy").
 */

/** GET/POST/PATCH /scorm/tracking yanıtı. GET hiç attempt yoksa `null` döner. */
export type ScormAttempt = {
  id: string;
  attemptId: string;
  suspendData: string | null;
  lessonStatus: string | null;
  score: number | null;
  totalTime: string | null;
  completionStatus: string | null;
  successStatus: string | null;
};

/**
 * PATCH gövdesi — backend yalnız gönderilen alanları günceller (kalan alanlar
 * mevcut değerini korur). cmi.* anahtarlarından türetilir (bkz. lib/scorm/bridge).
 */
export type ScormTrackingPatch = {
  suspendData?: string;
  lessonStatus?: string;
  score?: number;
  totalTime?: string;
  completionStatus?: string;
  successStatus?: string;
};
