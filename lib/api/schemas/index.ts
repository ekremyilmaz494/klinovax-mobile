import type { ZodType } from 'zod';

import { Sentry } from '@/lib/sentry';

/**
 * Backend yanıt şekli için runtime guard. Amaç: backend kontratı sessizce
 * değişirse (alan silinir/tip değişir) `undefined` patlamasını ekranlarda
 * kovalamak yerine TEK noktada loglanan bir sinyal almak.
 *
 * Graceful pass-through: doğrulama BAŞARISIZ olsa bile `data` olduğu gibi döner,
 * ASLA throw etmez. Sebep: bir alanın şeklinin değişmesi tüm akışı kilitlememeli —
 * eski/yeni alanların çoğu hâlâ kullanılabilir. Hata sadece raporlanır.
 *
 * `data`'nın parse edilmiş hali DEĞİL, orijinali döner. Sebep: zod parse'ı
 * şemada tanımsız alanları düşürebilir; backend'in eklediği yeni alanlar
 * (mobile henüz tipini bilmese de) tüketicilere korunarak ulaşmalı.
 */
export function validate<T>(schema: ZodType, data: T, context: string): T {
  const result = schema.safeParse(data);
  if (result.success) return data;

  const flattened = result.error.flatten();
  if (__DEV__) {
    // Prod'da console gürültüsü yok; sadece Sentry. Dev'de hemen göze çarpsın.
    console.warn(`[api-schema] ${context} yanıt şeması uyuşmuyor`, flattened);
  }

  Sentry.captureMessage(`[api-schema] ${context} yanıt şeması uyuşmuyor`, {
    level: 'warning',
    tags: { kind: 'schema-mismatch', context },
    extra: { fieldErrors: flattened.fieldErrors, formErrors: flattened.formErrors },
  });

  return data;
}
