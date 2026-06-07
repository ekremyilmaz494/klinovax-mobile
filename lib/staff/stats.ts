import type { MyTrainingItem } from '@/types/staff';

/**
 * Yüklenmiş eğitimlerin ortalama skoru (tam sayıya yuvarlanmış yüzde) — web personel
 * paneliyle (`apps/web/.../staff/my-trainings/page.tsx`) birebir aynı istemci-tarafı hesap.
 *
 * Paginated bir aggregate DEĞİL: yalnız o an yüklü olan sayfaların skorlarını ortalar,
 * sonsuz scroll'da daha fazla sayfa geldikçe değer netleşir. Web ile kasıtlı parite —
 * ekstra backend çağrısı yok.
 *
 * `score` truthy filtresi (web ile aynı) sıfır skoru dışarıda bırakır; skorlu hiç kayıt
 * yoksa `null` döner (çağıran taraf KPI'ı gizler).
 */
export function computeAverageScore(items: MyTrainingItem[]): number | null {
  const scores = items.filter((it) => it.score).map((it) => it.score!);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}
