/**
 * İşlem geçmişi (KVKK) — `GET /api/staff/audit-logs/me`. Kullanıcı yalnız KENDİ
 * kayıtlarını görür (backend `userId = currentUser` ile filtreler).
 */

export type AuditLog = {
  id: string;
  /** Ham aksiyon anahtarı (örn. 'user.login'); TR etiket için `lib/audit/labels.ts`. */
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
};

export type AuditLogsResponse = {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
