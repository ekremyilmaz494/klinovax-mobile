/**
 * KVKK (6698 sayılı Kanun) veri sahibi hak talepleri — `/api/staff/kvkk-requests`
 * ile senkron. Personel kişisel verilerine dair 9 hak türünde talep oluşturur;
 * kurum yasal süre içinde (30 gün) yanıtlar.
 */

export type KvkkRequestType =
  | 'access'
  | 'detail'
  | 'purpose'
  | 'third_party'
  | 'correction'
  | 'deletion'
  | 'notification'
  | 'objection'
  | 'damage';

export type KvkkStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export type KvkkRequest = {
  id: string;
  requestType: KvkkRequestType;
  status: KvkkStatus;
  description: string;
  /** Kurumun yanıt notu (tamamlanan/reddedilen taleplerde dolu olabilir). */
  responseNote: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type KvkkRequestsResponse = { requests: KvkkRequest[] };

export type CreateKvkkRequestBody = { requestType: KvkkRequestType; description: string };

export type CreateKvkkRequestResponse = {
  message: string;
  request: { id: string; requestType: KvkkRequestType; status: KvkkStatus; createdAt: string };
};
