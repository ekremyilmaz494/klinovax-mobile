/**
 * 360° değerlendirici tipi → Türkçe etiket (web staff/evaluations paritesi).
 * Bilinmeyen tip ham string döner (ileri uyum).
 */

const EVALUATOR_TR: Record<string, string> = {
  SELF: 'Öz değerlendirme',
  MANAGER: 'Yönetici',
  PEER: 'Akran',
  SUBORDINATE: 'Ast',
};

export function evaluatorTypeLabel(type: string): string {
  return EVALUATOR_TR[type] ?? type;
}

export type EvalStatusTone = 'success' | 'warning' | 'neutral';

const STATUS_META: Record<string, { label: string; tone: EvalStatusTone }> = {
  COMPLETED: { label: 'Tamamlandı', tone: 'success' },
  PENDING: { label: 'Bekliyor', tone: 'warning' },
};

export function evaluationStatusMeta(status: string): { label: string; tone: EvalStatusTone } {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}
