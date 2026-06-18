import { z } from 'zod';

/** `types/audit.ts` runtime guard'ı (GET /api/staff/audit-logs/me). */

const auditLogSchema = z.looseObject({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  createdAt: z.string(),
  ipAddress: z.string().nullable(),
});

export const auditLogsResponseSchema = z.looseObject({
  logs: z.array(auditLogSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
