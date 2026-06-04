import type {
  CreateKvkkRequestBody,
  CreateKvkkRequestResponse,
  KvkkRequestsResponse,
} from '@/types/kvkk';

import { apiFetch } from './client';

/** Kullanıcının KVKK hak taleplerini listeler. */
export function fetchKvkkRequests(): Promise<KvkkRequestsResponse> {
  return apiFetch<KvkkRequestsResponse>('/api/staff/kvkk-requests');
}

/**
 * Yeni KVKK hak talebi oluşturur (description 10-2000 karakter). Backend aynı
 * türde bekleyen talep varsa 409, rate-limit'te (5/300sn) 429 döner — çağıran
 * bunları kullanıcıya özel mesajla gösterir.
 */
export function createKvkkRequest(body: CreateKvkkRequestBody): Promise<CreateKvkkRequestResponse> {
  return apiFetch<CreateKvkkRequestResponse>('/api/staff/kvkk-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
