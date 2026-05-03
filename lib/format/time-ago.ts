/**
 * Türkçe relative time formatter — bildirim feed'i için.
 *
 * Format basamakları:
 *   <1 dk    → "Şimdi"
 *   <60 dk   → "X dk önce"
 *   <24 sa   → "X sa önce"
 *   <7 gün   → "X gün önce"
 *   ≥7 gün   → "DD MMM YYYY" (örn. "03 Mayıs 2026")
 *
 * Date input ISO string ya da Date kabul eder; geçersizse boş string döner.
 */

const TR_MONTHS_LONG = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export function timeAgo(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) return 'Şimdi' // gelecek tarih → kullanıcıya tutarsız görünmesin

  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Şimdi'
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} sa önce`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} gün önce`

  const day = String(date.getDate()).padStart(2, '0')
  const month = TR_MONTHS_LONG[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
