import { apiFetch } from './client';
import { createKvkkRequestResponseSchema, kvkkRequestsResponseSchema } from './schemas/kvkk';
import { validate } from './schemas/index';
import type {
  CreateKvkkRequestBody,
  CreateKvkkRequestResponse,
  KvkkRequestsResponse,
} from '@/types/kvkk';

/** Kullanıcının KVKK hak taleplerini listeler. */
export async function fetchKvkkRequests(): Promise<KvkkRequestsResponse> {
  const data = await apiFetch<KvkkRequestsResponse>('/api/staff/kvkk-requests');
  return validate(kvkkRequestsResponseSchema, data, 'staff.kvkkRequests');
}

/**
 * Yeni KVKK hak talebi oluşturur (description 10-2000 karakter). Backend aynı
 * türde bekleyen talep varsa 409, rate-limit'te (5/300sn) 429 döner — çağıran
 * bunları kullanıcıya özel mesajla gösterir.
 */
export async function createKvkkRequest(
  body: CreateKvkkRequestBody,
): Promise<CreateKvkkRequestResponse> {
  const data = await apiFetch<CreateKvkkRequestResponse>('/api/staff/kvkk-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return validate(createKvkkRequestResponseSchema, data, 'staff.createKvkkRequest');
}
