import { z } from 'zod';

/** `types/kvkk.ts` runtime guard'ı (KVKK hak talepleri). */

const kvkkRequestTypeSchema = z.enum([
  'access',
  'detail',
  'purpose',
  'third_party',
  'correction',
  'deletion',
  'notification',
  'objection',
  'damage',
]);

const kvkkStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'rejected']);

const kvkkRequestSchema = z.looseObject({
  id: z.string(),
  requestType: kvkkRequestTypeSchema,
  status: kvkkStatusSchema,
  description: z.string(),
  responseNote: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const kvkkRequestsResponseSchema = z.looseObject({
  requests: z.array(kvkkRequestSchema),
});

export const createKvkkRequestResponseSchema = z.looseObject({
  message: z.string(),
  request: z.looseObject({
    id: z.string(),
    requestType: kvkkRequestTypeSchema,
    status: kvkkStatusSchema,
    createdAt: z.string(),
  }),
});
