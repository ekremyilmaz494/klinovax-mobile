import { apiFetch } from './client';
import { auditLogsResponseSchema } from './schemas/audit';
import { validate } from './schemas/index';
import type { AuditLogsResponse } from '@/types/audit';

/** İşlem geçmişi (KVKK) — yalnız kullanıcının kendi kayıtları, sayfalı. */
export async function fetchAuditLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<AuditLogsResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const data = await apiFetch<AuditLogsResponse>(
    `/api/staff/audit-logs/me?page=${page}&limit=${limit}`,
  );
  return validate(auditLogsResponseSchema, data, 'staff.auditLogs');
}
