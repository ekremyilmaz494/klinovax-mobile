import type { ScormAttempt, ScormTrackingPatch } from '@/types/scorm';

/**
 * SCORM 1.2 köprüsü. WebView'a enjekte edilen `window.API` shim'i SCORM içeriğin
 * LMSInitialize/GetValue/SetValue/Commit/Finish çağrılarını karşılar; SetValue/Commit/
 * Finish olaylarını `postMessage` ile RN'e iletir. RN tarafı `cmiSetValueToPatch` ile
 * cmi.* anahtarlarını backend PATCH gövdesine çevirir (tek, test edilebilir eşleme —
 * web scorm/page.tsx LMSSetValue mantığıyla BİREBİR).
 */

/**
 * Tek bir cmi.* SetValue'sini PATCH fragmanına çevirir. İzlenmeyen anahtar → boş obje.
 * Eşleme web kanoniğiyle aynı: lesson_status→lessonStatus, score.raw→score (parseFloat),
 * total_time|session_time→totalTime, suspend_data→suspendData, completion/success_status.
 */
export function cmiSetValueToPatch(key: string, value: string): ScormTrackingPatch {
  switch (key) {
    case 'cmi.core.lesson_status':
      return { lessonStatus: value };
    case 'cmi.core.score.raw':
      return { score: parseFloat(value) || 0 };
    case 'cmi.core.total_time':
    case 'cmi.core.session_time':
      return { totalTime: value };
    case 'cmi.suspend_data':
      return { suspendData: value };
    case 'cmi.completion_status':
      return { completionStatus: value };
    case 'cmi.success_status':
      return { successStatus: value };
    default:
      return {};
  }
}

/** lesson_status passed/completed → eğitim tamamlandı (backend sertifikayı üretir). */
export function isScormCompletionStatus(status: string | null | undefined): boolean {
  return status === 'passed' || status === 'completed';
}

/** Attempt'ten WebView'a verilecek başlangıç cmi haritası (resume için seed). Web ile aynı. */
export function buildSeedCmi(attempt: ScormAttempt | null): Record<string, string> {
  return {
    'cmi.core.student_id': '',
    'cmi.core.student_name': '',
    'cmi.core.lesson_status': attempt?.lessonStatus || 'not attempted',
    'cmi.core.score.raw': attempt?.score != null ? String(attempt.score) : '',
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100',
    'cmi.core.total_time': attempt?.totalTime || '0000:00:00',
    'cmi.core.lesson_location': '',
    'cmi.core.exit': '',
    'cmi.suspend_data': attempt?.suspendData || '',
    'cmi.core.session_time': '0000:00:00',
    'cmi.completion_status': attempt?.completionStatus || 'unknown',
    'cmi.success_status': attempt?.successStatus || 'unknown',
  };
}

/**
 * `injectedJavaScriptBeforeContentLoaded` için `window.API` (SCORM 1.2) tanımlayan
 * JS dizesi. cmi haritasını seed'den taşır (resume), SetValue/Commit/Finish'i RN'e
 * postMessage'lar. Mapping RN tarafında (cmiSetValueToPatch) yapılır — shim ince tutulur.
 *
 * `seed` JSON.stringify ile gömülür (string escape güvenli). Script `true;` ile biter
 * (react-native-webview enjeksiyon konvansiyonu).
 */
export function buildScormApiInjection(seed: Record<string, string>): string {
  return `
(function () {
  if (window.API) { return true; }
  var cmi = ${JSON.stringify(seed)};
  function post(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }
  window.API = {
    LMSInitialize: function () { post({ type: 'init' }); return 'true'; },
    LMSGetValue: function (k) { return cmi[k] != null ? cmi[k] : ''; },
    LMSSetValue: function (k, v) { cmi[k] = String(v); post({ type: 'set', key: k, value: String(v) }); return 'true'; },
    LMSCommit: function () { post({ type: 'commit' }); return 'true'; },
    LMSFinish: function () { post({ type: 'finish' }); return 'true'; },
    LMSGetLastError: function () { return '0'; },
    LMSGetErrorString: function () { return ''; },
    LMSGetDiagnostic: function () { return ''; }
  };
  return true;
})();
true;
`;
}

/** WebView postMessage olayı (injected shim → RN). */
export type ScormBridgeMessage =
  | { type: 'init' }
  | { type: 'set'; key: string; value: string }
  | { type: 'commit' }
  | { type: 'finish' };
