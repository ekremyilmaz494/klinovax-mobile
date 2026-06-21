import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { sendGamificationEvent } from '@/lib/api/gamification';
import type { GamificationEventBody, NewBadge } from '@/types/gamification';

/**
 * Puan kazandıran olayları best-effort gönderir (fire-and-forget).
 *
 * NEDEN hata yutulur: olay bildirimi kullanıcı akışının (sonuç ekranı, geri
 * bildirim onayı) yan ürünüdür — bir puan POST'unun başarısızlığı (network/422/
 * 429) ekranı bloklamamalı ya da hata göstermemeli. Olaylar idempotent
 * (eventId === refId, backend dedupKey) olduğundan başarısız gönderim ekran
 * re-mount'unda zararsızca tekrarlanır.
 *
 * Award kaynağı ekranları (result/feedback) zaten online iken render olur (sonuç/
 * form fetch'i ağ gerektirir), bu yüzden ayrı offline-resume kuyruğuna gerek yok.
 *
 * Kredi gerçekten verildiğinde (pointsAwarded>0 veya yeni rozet) gamification +
 * daily-questions invalidate edilir: puan/streak/rozet ve anlık seed edilen yeni
 * "due" sorular tazelensin. Already-processed (0 kredi) dönüşlerde gereksiz
 * refetch yapılmaz.
 *
 * Yeni kazanılan rozetleri (varsa, id'ye göre tekilleştirilmiş) DÖNDÜRÜR; çağıran
 * ekran bununla rozet kutlaması gösterebilir. Hiç yoksa boş dizi.
 */
export function useAward() {
  const qc = useQueryClient();

  return useCallback(
    async (events: GamificationEventBody[]): Promise<NewBadge[]> => {
      if (events.length === 0) return [];

      let credited = false;
      const earned: NewBadge[] = [];
      for (const event of events) {
        try {
          const res = await sendGamificationEvent(event);
          if (res.pointsAwarded > 0 || res.newBadges.length > 0) credited = true;
          earned.push(...res.newBadges);
        } catch {
          // best-effort: sessizce yut, re-mount'ta tekrar denenir.
        }
      }

      if (credited) {
        qc.invalidateQueries({ queryKey: ['gamification'] });
        qc.invalidateQueries({ queryKey: ['daily-questions'] });
      }

      // Aynı rozet iki olaydan (exam_pass + training_complete) gelebilir → id'ye göre tekille.
      const seen = new Set<string>();
      return earned.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
    },
    [qc],
  );
}
