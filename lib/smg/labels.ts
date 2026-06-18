import type { SmgApprovalStatus } from '@/types/smg';

/**
 * SMG aktivite tipi + onay durumu → Türkçe etiket (web staff/smg page paritesi).
 * Bilinmeyen değer ham string döner (ileri uyum — backend yeni tip eklerse kırılmaz).
 */

const TYPE_TR: Record<string, string> = {
  EXTERNAL_TRAINING: 'Harici Eğitim',
  CONFERENCE: 'Konferans',
  PUBLICATION: 'Yayın',
  COURSE_COMPLETION: 'Kurs Tamamlama',
};

export function smgActivityTypeLabel(type: string): string {
  return TYPE_TR[type] ?? type;
}

export type SmgStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_META: Record<SmgApprovalStatus, { label: string; tone: SmgStatusTone }> = {
  APPROVED: { label: 'Onaylandı', tone: 'success' },
  PENDING: { label: 'Bekliyor', tone: 'warning' },
  REJECTED: { label: 'Reddedildi', tone: 'danger' },
};

export function smgStatusMeta(status: string): { label: string; tone: SmgStatusTone } {
  return STATUS_META[status as SmgApprovalStatus] ?? { label: status, tone: 'neutral' };
}
