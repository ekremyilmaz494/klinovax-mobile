# Klinovax Mobil ↔ hospital-lms Gamification Backend Uyum Doğrulama Raporu

> Kaynak: backend PR #202 (`feat(gamification): Klinovax oyunlaştırma backend (Faz 1-3)`) `origin/main`'de. 4 Opus inceleyici ajan, backend kodunu mobil kontratıyla satır satır karşılaştırdı.
> Tarih: 2026-06-21

> **Not (CLAUDE.md düzeltmesi):** Mobil `CLAUDE.md` backend'i "Drizzle" olarak tanımlıyor. Backend PR #202 ile gelen gamification katmanı **Prisma** kullanıyor (schema.prisma, Prisma migrations, P2002 unique-violation yakalama). Mobil hafıza dosyası bu noktada **yanlış**; backend ORM'i Prisma'dır.

---

## 1. Genel hüküm

**CANLI olan iki endpoint (`GET /api/staff/daily/questions` ve `POST /api/staff/daily/submit`) mobil zod şemalarını ve tiplerini KIRMIYOR.** Alan-alan, tip-tip eşleşiyor; yollar mobil callsite'larıyla (`lib/api/daily.ts`) birebir aynı; auth `withStaffRoute` (Bearer JWT + staff rol + org zorunlu) ile sarılı. **Mobil, daily akışında olduğu gibi çalışır.**

Tek koşul: mobil `submissionId` üreticisi geçerli bir **v4 UUID** üretmeli (backend `z.string().uuid()` zorunlu kılıyor).

Henüz CANLI olmayan **Faz 2/3 endpoint'lerinde (gamification/summary, gamification/event)** bir adet **BLOCKER** var: `event` yanıtındaki `newBadges` alanı backend'de **obje dizisi**, mobil kontratında **string dizisi**. Bu, Faz 3 bağlanmadan önce çözülmeli. summary endpoint'i tam uyumlu.

**Özet cümle:** _Daily akışı (CANLI) mobil olduğu gibi çalışır. Faz 2/3 bağlanmadan önce `gamification/event.newBadges` tip uyumsuzluğu ve badge ikon isimleri düzeltilmeli._

---

## 2. Uyum tablosu

| Endpoint/Konu                        | Mobil bekliyor                                                                                       | Backend veriyor                                                                                                | Durum           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------- |
| `GET daily/questions`                | `{available, dueCount, serverDate, questions[{questionId, prompt, box, options[{optionId, text}]}]}` | Birebir aynı; `isCorrect` asla seçilmiyor (cevap sızmıyor)                                                     | ✅              |
| `POST daily/submit` (request)        | `{submissionId, answers[{questionId, optionId}]}`                                                    | Aynı şekil; ek olarak `.uuid()` + `.min(1).max(20)` sıkılaştırması                                             | ✅ (UUID şartı) |
| `POST daily/submit` (response)       | `{correctCount, pointsAwarded, results[{questionId, correct, newBox, nextReviewAt}]}`                | Alan-tip birebir aynı                                                                                          | ✅              |
| `GET gamification/summary`           | `{points, streak{current,longest,freezesLeft,atRisk}, badges[{id,tier,icon,earned,earnedAt?}]}`      | Birebir aynı; `id=badge.code`, güvenli default'lar                                                             | ✅              |
| `POST gamification/event` (request)  | `{eventId, type, refId}`, type∈{exam_pass, training_complete, feedback_submit}                       | Birebir aynı, zod + enum whitelist                                                                             | ✅              |
| `POST gamification/event` (response) | `{ok, pointsAwarded, newBadges: string[]}`                                                           | `{ok, pointsAwarded, newBadges: {id,tier,icon}[]}` — **obje dizisi**                                           | ❌              |
| Leitner tablosu                      | `[0,1,3,7,16,35]`, MAX_BOX=5, doğru→min(box+1,5), yanlış→0                                           | Birebir aynı (constants.ts + leitner.ts)                                                                       | ✅              |
| Streak server-clock                  | İstanbul sunucu saati, cihaz saati değil                                                             | `istanbulDateString` ile server-clock; aynı-gün no-op                                                          | ✅              |
| Badge ikon isimleri                  | IconSymbol MAPPING'inde olmalı                                                                       | Katalog ikonlarının çoğu uyumlu; `flame.fill`/`trophy.fill` (ve olası `medal.fill`) Android/web MAPPING'de YOK | ⚠️              |
| Cron `daily-quiz-push` data.url      | `/daily-quiz` (push handler whitelist)                                                               | Cron `url='/daily-quiz'` gönderiyor; `data.url` iç-yuvalaması (expo-push.ts) snapshot'ta **doğrulanamadı**     | ⚠️              |
| Idempotency (submit + event)         | dedup + DB unique → tek kredi                                                                        | `submissionId` snapshot + `dedupKey` UNIQUE + P2002 yakalama                                                   | ✅              |

---

## 3. BLOCKER uyumsuzluklar

### BLOCKER-1 — `gamification/event.newBadges` tip farkı (obje vs string)

- **Nerede:** `POST /api/staff/gamification/event` yanıtı (`event/route.ts`; `badges.ts`).
- **Mobil ne bekliyor:** `newBadges: string[]` — örn. `['first_pass']`.
- **Backend ne veriyor:** `newBadges: {id, tier, icon}[]` — örn. `[{id:'first_pass', tier:'bronze', icon:'checkmark.seal.fill'}]`.
- **Etki:** Eleman tipi farklı (obje vs string). Faz 3'te yeni-rozet kutlama/toast akışında sessiz UI kırılması.
- **Düzeltme (öneri: MOBİL düzeltsin):** Backend obje dönüyor ve `tier`+`icon` taşıdığı için zaten daha zengin (ek summary fetch'i gereksiz). Mobil kontratını obje tüketecek şekilde güncelle (`newBadges: {id, tier, icon}[]`). Karar Faz 3 bağlanmadan önce verilmeli. **Bu endpoint CANLI olmadığı için üretimi etkilemiyor.**

> Daily akışında (CANLI) **hiçbir blocker yok.** Tek BLOCKER, henüz bağlanmamış Faz 3 endpoint'inde.

---

## 4. Idempotency cevabı (büyük açık soru)

**Hem `submit` hem `event` güçlü ve doğru biçimde idempotent.**

- **`daily/submit`:** `submissionId` dedup. (1) Yazımdan önce `findUnique({submissionId})` → varsa snapshot döner, yeni kredi yok. (2) `pointLedger.dedupKey='daily_review:${submissionId}'` UNIQUE ile tek kredi. (3) Eşzamanlı duplicate'ler P2002'ye düşer, yakalanır, snapshot döner.
- **`gamification/event`:** `dedupKey='${type}:${eventId}'` pre-check + `PointLedger.dedupKey` UNIQUE + P2002 → tekrarda `pointsAwarded:0`.

### Mobil offline-resume (PERSISTED_MUTATION_KEYS) AÇILABİLİR Mİ? → **EVET**

Offline-resume kuyruğunun aynı `submissionId`/`eventId` ile tekrar oynattığı mutation backend'de **tam bir kez** kredi verir; çift-kredi yapısal olarak imkansız (DB UNIQUE + P2002). `submitDailyAnswers` ve (Faz 3'te) `gamification/event` güvenle persisted edilebilir.

> **Açma öncesi tek koşul:** `gamification/event` rate limit **60/saat**, `daily/submit` **30/saat**. Offline kuyruğu toplu replay'de **429** alabilir → mobil resume mantığı 429'u **drop değil, retry** (geri-çekilme) olarak ele almalı.

---

## 5. Parite & güvenlik

- **Leitner paritesi:** `[0,1,3,7,16,35]`, MAX_BOX=5, doğru→`min(box+1,5)`, yanlış→0 — backend ↔ mobil **bit-bit aynı**. Latent risk: backend MAX_BOX=5 hardcoded, mobil `length-1`'den türetiyor; bugün eşit, tablo değişirse senkron tutulmalı.
- **`nextReviewAt` (info):** Backend İstanbul gün-sonu UTC, mobil local `setDate`. Runtime kırılması yok (sunucu doğru kaynak; mobil string'i olduğu gibi tüketir). İki tarafın timestamp'i bit-aynı varsayılmamalı.
- **Streak server-clock:** İstanbul sunucu saati; ilk dokunuş→1/1/freezesLeft=2, aynı-gün no-op, dün→+1, ≥2 gün boşluk→reset. `computeAtRisk` aynı kaynaktan. ✅
- **Event anti-cheat:** `verifyEvent` puanı sunucu sabitlerinden türetir (exam_pass=50, training_complete=30, feedback_submit=15); mobilin iddiası asla güvenilmez. `exam_pass` gerçek `ExamAttempt` (refId+userId+org+isPassed) ile çapraz-doğrulanır; aksi halde 422, ledger yazımı yok. ✅
- **Daily anti-cheat:** Due-seçim ve doğru/yanlış sunucuda `QuestionOption.isCorrect` üzerinden; client `optionId` yalnız eşleştirilir. `isCorrect` questions yanıtında sızmaz. ✅
- **RLS:** Gamification SELECT politikaları `user_id=auth.uid()`. **Uyarı:** ledger/submission'da org-scoped RLS yok, yalnız `user_id`.
- **Cron `data.url='/daily-quiz'`:** Cron `url='/daily-quiz'` gönderiyor (test doğruluyor); mobil whitelist içeriyor. Ancak `expo-push.ts` `data.url` iç-yuvalaması snapshot'ta yoktu → tap-routing tam zinciri **doğrulanamadı** (cihazda test gerek).

---

## 6. Badge ikon isimleri

- gamification routes kümesi (migration.sql): 7 katalog ikonunun hepsi geçerli SF Symbol adı — `sparkles, star.fill, medal.fill, trophy.fill, flame.fill, checkmark.seal.fill`.
- lib parite kümesi (mobil `icon-symbol.tsx` Android/web MaterialIcons MAPPING): `rosette, star.fill, graduationcap.fill, sparkles, checkmark.seal.fill` VAR; **`flame.fill`, `trophy.fill`, `medal.fill` YOK**.

**Sonuç:** iOS native (`icon-symbol.ios.tsx`) muhtemelen sorunsuz; **gap Android/web MaterialIcons MAPPING'i.** Eklenecek eşlemeler:

| SF Symbol (backend) | MaterialIcons fallback  |
| ------------------- | ----------------------- |
| `flame.fill`        | `local-fire-department` |
| `trophy.fill`       | `emoji-events`          |
| `medal.fill`        | `military-tech`         |

> Doğrulanamadı: üretim `Badge` tablosunun gerçek `icon` değerleri (seed) snapshot'ta yoktu.

---

## 7. Mobil tarafta gereken aksiyonlar

1. **`submissionId` üreticisini UUID yap** — backend `.uuid()` zorunlu. (✅ yapıldı: `app/daily-quiz.tsx` RFC-4122 v4 üretiyor.)
2. **CLAUDE.md düzelt** — backend ORM'i (gamification) Prisma, Drizzle değil.
3. **Offline-resume'ü AÇ** — `submitDailyAnswers` (ve Faz 3'te `gamification/event`) için `PERSISTED_MUTATION_KEYS`/`mutation-defaults.ts`. Idempotency tam.
4. **429 retry mantığı** — offline-resume replay'inde 429'u retry/backoff olarak ele al (drop etme).
5. **(Faz 3 öncesi) `newBadges` tipi** — mobil kontratını `{id, tier, icon}[]` objesine güncelle (önerilen) VEYA backend string dizisi dönsün.
6. **(Faz 2/3 öncesi) Badge ikon eşlemeleri** — `icon-symbol.tsx` MAPPING'ine flame/trophy/medal ekle veya seed değerlerini mevcut sete kısıtla.
7. **(Faz 2/3 öncesi) zod şemaları** — `gamification/summary` + `event` için mobil zod şeması yaz; `streak.freezesLeft`, `badges[].icon/earned/earnedAt`, `newBadges` eleman tipini backend emisyonuyla eşle.
8. **Push tap-routing'i cihazda e2e test et** — `data.url='/daily-quiz'` zinciri.

---

## 8. Açık / riskli noktalar (doğrulanamayanlar)

- `expo-push.ts` / `data.url` iç-yuvalaması snapshot'ta yoktu — cihazda test gerek.
- `withStaffRoute` (JWT çıkarımı) kısmi checkout'ta yoktu — test mock'larından çıkarıldı.
- Üretim `Badge` seed `icon` değerleri snapshot'ta yoktu.
- `nextReviewAt` algoritma farkı (İstanbul UTC vs local) — offline-display'de minik gün-kayması olabilir.
- `earnedAt` (ISO) vs `nextReviewAt` (date-only) — ikisi de string; mobil string olarak ele almalı.
- RLS org-scope yok (yalnız `user_id`); `PointLedger.points` DB CHECK yok (app-seviyesi koruma).
- MAX_BOX coupling: backend hardcoded 5, mobil türetilmiş 5 — tablo değişirse senkron gerek.
