# Web Personel Paneli & Eğitim Akışı — Tam Harita + Mobil Boşluk Analizi

> **Amaç:** `hospital-lms` (Next.js 16 web) personel panelinin — özellikle eğitim/sınav
> akışının — kod-seviyesinde haritası ve `klinovax-mobile` (Expo/RN) mevcut durumuyla
> karşılaştırması. Mobil geliştirme bu dökümana göre planlanır.
>
> **Kaynak repolar:**
>
> - Web: `/Users/ekremyilmaz/code/hospital-lms` → app kökü `apps/web` (monorepo)
> - Mobil: `/Users/ekremyilmaz/code/klinovax-mobile` (Expo Router)
> - **Ortak backend:** mobil, web ile **aynı** `/api/*` endpoint'lerini çağırır.
>
> Doküman tarihi: 2026-05-31. Web ref'leri `apps/web/src/...`, mobil ref'leri `klinovax-mobile/...`.

---

## 1. Genel Bakış & Mimari

| Katman     | Web                                                                      | Mobil                                                |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| UI         | Next.js 16 App Router, RSC + `"use client"`                              | Expo Router (`app/`), React Native                   |
| Durum      | Zustand + (sayfa state)                                                  | Zustand (`store/`) + TanStack Query (persist)        |
| Veri çekme | `useFetch` / RSC                                                         | TanStack Query + `lib/api` fetch wrapper             |
| Auth       | Supabase JWT **cookie** (chunked SSR)                                    | Supabase JWT **Bearer header** + `expo-secure-store` |
| Video      | `<video>` HTML element                                                   | `expo-video`                                         |
| Backend    | **ORTAK** — `apps/web/src/app/api/*` (`withStaffRoute`, RLS, rate-limit) | aynı API                                             |

**Kritik ilke:** Eğitim akışının doğruluğu (puanlama, süre, anti-cheat) **sunucuda** zorlanır.
Mobil "iyimser" davranır, sunucu doğrular. Bu yüzden akışın en önemli kısmı API sözleşmelerine
**sadık** kalmaktır — mantığı yeniden yazmak değil.

---

## 2. İki State Machine — Akışın Kalbi

Kaynak: `apps/web/src/lib/exam-state-machine.ts`

### 2.1 `ExamAttempt.status` (bir sınav denemesinin durumu)

```
                      ┌─ examOnly=true ───────────────────────────────► post_exam
START (current=null) ─┼─ retry && !requirePreExamOnRetry ─────────────► watching_videos
                      ├─ retry && requirePreExamOnRetry ──────────────► pre_exam
                      └─ normal ──────────────────────────────────────► pre_exam

pre_exam        ──PRE_EXAM_SUBMITTED──►  watching_videos
watching_videos ──VIDEOS_COMPLETED────►  post_exam
post_exam       ──POST_EXAM_SUBMITTED─►  completed

pre_exam | post_exam ──TIMEOUT──►  completed   (süre doldu, deneme yanar, isPassed=false)
herhangi non-terminal ──EXPIRE──►  expired      (24h+ stale / admin / cron)
```

- Terminal: `completed`, `expired`.
- Geçişler `attemptNextStatus()` ile doğrulanır; geçersiz geçiş `{ ok:false, reason }` döner → 400.

### 2.2 `TrainingAssignment.status` (atamanın durumu)

```
assigned ──ATTEMPT_STARTED──► in_progress
in_progress ──POST_EXAM_PASSED──► passed                        (terminal)
in_progress ──POST_EXAM_FAILED (hak var)──► in_progress         (tekrar deneyebilir)
in_progress ──POST_EXAM_FAILED (hak bitti)──► failed            (terminal)
assigned|in_progress ──TRAINING_LOCKED──► locked                (eğitim arşiv/silindi)
in_progress|failed ──ATTEMPT_RESET──► assigned                  (admin ek hak verdi)
```

> 📱 **Mobil taşınabilirlik:** İki state machine de **saf mantık** — RN'e birebir kopyalanabilir.
> İdeal olarak bu dosyanın bir TS portu mobile alınmalı (tek doğru kaynak).

---

## 3. Faz-Faz Eğitim Akışı (web `/exam/[id]/*`)

`/exam/[id]/page.tsx` bir **sunucu router'ı**: kimlik + aktif/son attempt durumuna bakıp doğru faza
yönlendirir. SCORM eğitimi ise `/exam/[id]/scorm`'a gider.

```
my-trainings/[id]  ──"Başla / Devam / Tekrar Dene"──►  /exam/[id]
   │
   ├─ no attempt / pre_exam ─► /exam/[id]/pre-exam   ──submit──► /exam/[id]/transition?from=pre
   │                                                                    │
   ├─ watching_videos ───────► /exam/[id]/videos     ──bitti──► /exam/[id]/transition?from=videos
   │                                                                    │
   ├─ post_exam ─────────────► /exam/[id]/post-exam  ──submit──► /exam/[id]/transition?from=post-exam
   │                                                                    │ (sonuç ekranı)
   │                                                          ──► (gerekiyorsa) /exam/[id]/feedback
   │
   └─ completed / expired ───► /staff/my-trainings/[id]   (detaya döner, listeye değil)
```

| Faz                    | Route        | Çağrılan API                                            | Render                            |
| ---------------------- | ------------ | ------------------------------------------------------- | --------------------------------- |
| Onay/kurallar + başlat | `pre-exam`   | `POST start`, `GET questions?phase=pre`, `POST timer`   | Kural ekranı → sorular            |
| Ön sınav soruları      | `pre-exam`   | `POST save-answer`, `POST submit{phase:pre}`            | Soru kartı + sayaç + navigatör    |
| Geçiş                  | `transition` | `POST start` (durumu ilerletir)                         | Geri sayım + "devam"              |
| Video izleme           | `videos`     | `GET videos`, `POST videos` (heartbeat/complete)        | Player + video listesi + progress |
| Son sınav              | `post-exam`  | `GET questions?phase=post`, `POST submit{phase:post}`   | Soru kartı + sayaç                |
| Sonuç                  | `transition` | `GET results` (refresh fallback), `GET feedback/status` | Geçti/kaldı + soru analizi        |
| Feedback               | `feedback`   | `GET feedback/[formId]/schema`, `POST .../submit`       | Likert/evet-hayır/metin form      |
| SCORM                  | `scorm`      | `GET/POST/PATCH scorm/tracking`                         | iframe + SCORM 1.2 API            |

---

## 4. Anti-Cheat (K1–K4) + Tab-Lock + Timer

| Kural        | Ne                                                                           | Nerede zorlanır                | RN karşılığı                                       |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| **K1**       | Video hızlı-tamamlama tavanı: izlenen ≤ `(geçen süre)*1.5 + 30sn`            | **Sunucu** (`videos/route.ts`) | Yok — sunucu halleder                              |
| **K2**       | Post-exam puanı request body'den DEĞİL **DB'deki** `examAnswer`'dan          | **Sunucu** (`submit/route.ts`) | Yok — sunucu halleder                              |
| **K3**       | Sekme değişimi sayımı (`visibilitychange`) → submit'e `tabSwitchCount`       | Client (web)                   | `AppState` (background/foreground)                 |
| **K4**       | Kopya/kes/sağ-tık engeli, `user-select:none`                                 | Client (web)                   | Sınırlı — uzun-bas menü + (ops.) screenshot engeli |
| **Tab-lock** | Aynı attempt birden çok sekmede açılamaz (`localStorage`+`BroadcastChannel`) | Client (web)                   | **Gereksiz** — mobilde tek instance                |

**Timer (Redis otoritesi):** `exam:timer:{attemptId}`, değer = `expiresAt`, TTL = `süre*60 + 60sn`.

- Client yalnız **görsel** sayaç gösterir.
- `submit` sunucuda `elapsed > (süre + 5dk)` ise **403** reddeder (gerçek otorite).
- Redis düşerse DB `phaseStartedAt`'ten kurtarır; süre geçmişse `autoCompleteExpiredAttempt()`.

> 📱 K1/K2/timer mobilde **yeniden yazılmaz** — sadece API doğru çağrılır. K3/K4 client'a özgü ve
> mobilde şu an eksik (bkz. §11).

---

## 5. Video Alt Sistemi

- **İmzalı URL (KRİTİK):** kanonik kaynak `videoKey` → CloudFront imzalı URL
  (`resolveTrainingVideoUrl`, `apps/web/src/lib/training-video-url.ts`). Ham `videoUrl` **asla**
  döndürülmez; imzalama başarısızsa `''`. Anahtar aileleri ayrı: video `videoKey()`, PDF
  `documentKey()`, ses `audioKey()`.
- **İmzalı URL geçicidir + kullanıcıya özeldir** → mobil bu URL'i **cache'lememeli**; gerekirse
  `GET /videos/stream?videoId=` ile tazeler.
- **Heartbeat:** `POST /videos` ile `{ videoId, watchedTime, position }` periyodik gönderilir.
- **Tamamlama (DOĞRULANDI — bkz. §11.1):** video ancak `<video> onEnded` → `completed:true`
  **VE** sunucudaki `ANTI_CHEAT_WATCH_FLOOR = 0.9` (izlenen ≥ %90) sağlanınca tamamlanır.
  Üründe karar: izleme yüzdesi tek başına geçemez; kanonik sinyal **doğal bitiş (onEnded)**.
  Kaynak: `apps/web/src/app/api/exam/[id]/videos/route.ts:337-364`.
- **No-seek:** web `lastAllowedTime` ref'i ile ileri sarmayı geri sarar.
- **PDF:** opsiyonel; tamamlamayı bloklamaz, "tüm videolar bitti" sayımına girmez.
- **Audio:** ayrı `audio-player.tsx`; `onProgressRef` ile re-render'dan bağımsız heartbeat
  (commit `a7b05b28`). K1 fallback: `preExamCompletedAt` null ise `createdAt`.

> 📱 RN: `expo-video`. Tamamlamayı **`playToEnd`/`status.didJustFinish`** olayına bağla (web onEnded
> sadakati). No-seek için `expo-video` event'lerinden seek tespiti gerekir (native kontroller seek'e
> izin verir).

---

## 6. API Sözleşmeleri (mobilin konuştuğu yüzey)

Tümü `withStaffRoute` (`staff|admin|super_admin`) + `requireOrganization` + rate-limit.
Auth: web cookie, **mobil `Authorization: Bearer <jwt>`**.

| Method   | Path                                       | İstek                                                            | Yanıt (özet)                                                                                                          | Önemli hatalar                                           | Rate    |
| -------- | ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------- |
| POST     | `/api/exam/[id]/start`                     | —                                                                | `{ id(attemptId), status, examOnly, redirectTo? }`                                                                    | 403 (kilit/tarih/feedback), **423 pendingFeedback**, 429 | 10/saat |
| GET      | `/api/exam/[id]/questions?phase=pre\|post` | —                                                                | `{ trainingTitle, examType, totalTime, questions[] }`                                                                 | 400 phase, 403 faz                                       | —       |
| POST     | `/api/exam/[id]/save-answer`               | `{ questionId, selectedOptionId, examPhase }`                    | `{ saved:true }`                                                                                                      | **423** (post-exam 30sn sonrası kilit), 429              | 60/dk   |
| POST     | `/api/exam/[id]/submit`                    | `{ phase, answers[], tabSwitchCount }`                           | pre: `{ score, nextStep }` · post: `{ score, isPassed, passingScore, attemptsRemaining, results?, feedbackRequired }` | 400 faz, 403 süre                                        | 20/saat |
| GET      | `/api/exam/[id]/results`                   | —                                                                | `{ isPassed, score, passingScore, attemptsRemaining, results? }` (kaldıysa results=null)                              | 404, 400                                                 | —       |
| POST     | `/api/exam/[id]/sign`                      | `{ signatureData, signatureMethod:'canvas'\|'acknowledge' }`     | `{ success, signedAt }`                                                                                               | 403 (geçmemiş), 409 (imzalı)                             | —       |
| GET/POST | `/api/exam/[id]/timer`                     | —                                                                | `{ remainingSeconds, expiresAt?, expired }`                                                                           | 403, 404                                                 | —       |
| GET      | `/api/exam/[id]/videos`                    | `?mode=review?`                                                  | `{ trainingTitle, attemptStatus, videos[] }` (imzalı url)                                                             | 403, 404                                                 | —       |
| POST     | `/api/exam/[id]/videos`                    | `{ videoId, watchedTime?, position?, completed?, currentPage? }` | `{ progress:true, allVideosCompleted }`                                                                               | 400 faz, 429                                             | 60/dk   |
| GET      | `/api/exam/[id]/videos/stream?videoId=`    | —                                                                | `{ streamUrl, video }`                                                                                                | 404, 503 imza                                            | —       |
| GET/POST | `/api/exam/[id]/videos/progress`           | `{ videoId, watchedSeconds, lastPositionSeconds }`               | `{ progress, allVideosCompleted }`                                                                                    | 429                                                      | 60/dk   |

> **Determinizm uyarısı:** sorular ve şıklar `attemptId + phase` seed'iyle **sunucuda** karıştırılır.
> Mobil bu listeyi **olduğu gibi** kullanmalı; client'ta yeniden karıştırırsa puanlama bozulur.

---

## 7. Veri Modeli (ilgili Prisma modelleri)

Kaynak: `apps/web/prisma/schema.prisma`

- **Training:** `passingScore`(70), `maxAttempts`(3), `examDurationMinutes`(30), `startDate/endDate`,
  `examOnly`, `requirePreExamOnRetry`, `randomizeQuestions`, `randomQuestionCount`, `scorm*`.
- **TrainingVideo:** `videoKey`(kanonik), `documentKey`, `durationSeconds`, `contentType`
  (`video|pdf|audio`), `sortOrder`.
- **Question / QuestionOption:** `questionText`, `points`(10) / `optionText`, `isCorrect`.
- **TrainingAssignment:** `status`, `currentAttempt`, `maxAttempts`(override), `originalMaxAttempts`
  (feedback kuralı için sabit), `round`, `dueDate`, `periodId`.
- **ExamAttempt:** `status`, `attemptNumber`, `preExamScore/StartedAt/CompletedAt`,
  `postExamScore/StartedAt/CompletedAt`, `videosCompletedAt`, `isPassed`, `signedAt/signatureData`.
- **ExamAnswer:** `(attemptId, questionId, examPhase)` unique; `examPhase: pre|post`; `isCorrect`.
- **VideoProgress:** `(attemptId, videoId)` unique; `watchedSeconds`, `lastPositionSeconds`,
  `isCompleted` (Math.max guard ile asla azalmaz).
- **Certificate:** `attemptId` unique (geçen denemeye 1:1), `certificateCode`, `expiresAt`.
- **ExamAttemptRequest:** ek deneme talebi — `reason`, `status(pending|approved|rejected)`,
  `grantedAttempts`.

---

## 8. Diğer Personel Menüleri (web)

Sidebar: `apps/web/src/components/layouts/sidebar/sidebar-config.ts` (`staffNav`).

| Menü                    | Route                           | API                                                        | Mobilde var mı? |
| ----------------------- | ------------------------------- | ---------------------------------------------------------- | --------------- |
| Dashboard               | `/staff/dashboard`              | `GET /api/staff/dashboard`                                 | ✅              |
| Eğitimlerim             | `/staff/my-trainings`           | `GET /api/staff/my-trainings`                              | ✅              |
| Eğitim detay            | `/staff/my-trainings/[id]`      | `GET /api/staff/my-trainings/[id]`                         | ✅              |
| Sertifikalarım          | `/staff/certificates`           | `GET /api/staff/certificates`, `.../pdf`, `transcript/pdf` | ✅              |
| Bildirimler             | `/staff/notifications`          | `GET/PATCH/DELETE /api/staff/notifications`                | ✅              |
| Profil                  | `/staff/profile` (+`/activity`) | `GET/PATCH /api/staff/profile`, `audit-logs/me`            | ✅ (kısmi)      |
| Takvim                  | `/staff/calendar`               | `GET /api/staff/calendar`                                  | ❌              |
| Geri Bildirimler        | `/staff/feedback`               | `GET /api/staff/feedback/pending`                          | ❌              |
| Değerlendirmeler (360°) | `/staff/evaluations` (+`[id]`)  | `GET/POST /api/staff/evaluations*`                         | ❌              |
| Yetkinlik Sonuçları     | `/staff/competency`             | `GET /api/staff/competency/me`                             | ❌              |
| SMG Puanları (sağlık)   | `/staff/smg`                    | `GET /api/staff/smg/my-points`, `POST .../activities`      | ❌              |

**Push:** Expo → `POST /api/staff/push/expo/register|unregister` (`{ token, platform, deviceName }`).
Web push → `subscribe|unsubscribe`. **Realtime bildirim:** Supabase Realtime kanalı
`notifications:${userId}` (web & mobil ortak kullanabilir).

---

## 9. my-trainings → exam Köprüsü (mobil için en kritik akış)

`apps/web/src/app/staff/my-trainings/[id]/page.tsx` durum tespiti:

```
Atama yok?                         → 404
Attempt yok (FRESH)
   ├─ startDate > now              → LOCKED (geri sayım banner'ı, CTA kapalı)
   ├─ endDate < now                → EXPIRED (kırmızı banner, CTA yok)
   └─ normal                       → adım 0 (examOnly ise direkt post-exam)
Aktif attempt (terminal değil)     → mevcut adım, CTA "Devam"
Tamamlanmış attempt
   ├─ isPassed=true                → PASSED (yeşil, "tekrar izle" + sertifika)
   ├─ isPassed=false & hak var     → RETRY_PENDING (sarı, ön sınav atlanır → 2 adım)
   └─ isPassed=false & hak bitti   → EXHAUSTED (kırmızı, **ek hak talebi formu**)
Expired attempt (cron) & deadline gelmedi & hak var
                                   → EXPIRED_RETRYABLE (sarı: "önceki deneme süresi doldu,
                                     ilerleme TAŞINMAZ, baştan")
```

- **Adım ilerlemesi:** normal 3 adım (Ön sınav → Video → Son sınav); retry'da
  `requirePreExamOnRetry=false` ise 2 adım (Video → Son sınav).
- **CTA route'lama:** examOnly → `post-exam`; adım 0 → `pre-exam`; adım 1 → `videos`; adım 2 → `post-exam`.
- **Ek hak talebi:** `GET/POST /api/staff/attempt-requests` (reason ≥10 karakter; pending/approved/rejected).
- **Feedback (EY.FR.40):** form aktif + tetikleyici attempt varsa CTA → `/exam/[trainingId]/feedback?attemptId=`.

> 📱 Bu durum makinesi mobil `app/trainings/[id].tsx`'te **eksiksiz** karşılanmalı (özellikle
> EXPIRED_RETRYABLE ve ek hak talebi — bkz. §11.5).

---

## 10. Mobil Mevcut Durum (klinovax-mobile)

Stack: Expo Router, `expo-video`, `expo-notifications`, `expo-secure-store`, Zustand, TanStack Query
(AsyncStorage persist, 24h), `@supabase/supabase-js`, `@sentry/react-native`, biyometrik kilit.

**Route envanteri (var olanlar):**
`(auth)/login` · `(tabs)/{dashboard,trainings,certificates,notifications,profile}` ·
`trainings/[id]` · `exam/[assignmentId]/{start,questions,videos,result}` ·
`certificates/[id]/preview` · `legal/[slug]`.

**Sınav akışı (mobil):**

- `start.tsx` — kural ekranı + `POST start` + durum-route'lama, **423 pendingFeedback yakalanıyor**.
- `questions.tsx` — `GET questions` + `POST timer` (server-otorite, `staleTime:Infinity`),
  auto-save, süre dolunca **oto-submit**, iOS swipe-back kapalı + Android back-guard, faz geçiş modalı.
  Hem pre hem post aynı ekran (phase param'ı farklı).
- `videos.tsx` — `expo-video`, 5sn tick heartbeat (10sn birikince POST), accumulator ile skip-to-end
  koruması, PDF (WebView), mute.
- `result.tsx` — `GET results`, skor + (sadece geçtiyse) soru detayı, retry/sertifika CTA, cache invalidation.

**API kapsama (mobil çağırıyor):** `start, questions, save-answer, submit, timer, results, videos(GET/POST)`,
`staff/{dashboard,my-trainings,my-trainings/[id],certificates,profile,notifications,push/expo/*}`,
`auth/{login,refresh}`.

**Mobilin ÇAĞIRMADIĞI:** `sign`, `videos/stream`, `videos/progress`, feedback endpoint'leri,
`evaluations/competency/calendar/smg/feedback/pending`, `attempt-requests`.

---

## 11. 🔬 Mobil Boşluk Analizi & Doğrulanmış Iraksamalar

### 11.1 ✅ Video tamamlama eşiği uyuşmuyor — **KODDA DOĞRULANDI → DÜZELTİLDİ (fix/video-completion-90)**

> **Çözüm (2026-06-01):** `videos.tsx` tamamlama eşiği %90'a çekildi (`video.duration * 0.9`,
> DB duration üzerinden), `playToEnd` (web onEnded paritesi) kanonik tetikleyici olarak eklendi,
> `watchedTime`'a floor-yuvarlama sigortası kondu. Aşağıdaki analiz tarihsel kayıt.

- **Backend:** `ANTI_CHEAT_WATCH_FLOOR = 0.9`; `nextCompleted = body.completed===true && watched ≥ %90`.
  Web tamamlamayı `<video> onEnded` ile gönderir.
  → `apps/web/src/app/api/exam/[id]/videos/route.ts:361-364`
- **Mobil:** tamamlamayı **`accumulated >= player.duration * 0.8`** (%80) ile, onEnded'den bağımsız tetikler.
  → `klinovax-mobile/app/exam/[assignmentId]/videos.tsx:380-393`
- **Risk:** mobil %80'de `completed:true` + ~%80 `watchedTime` gönderir → backend %90 ister, reddeder →
  video **tamamlanmamış** kalır, `allVideosCompleted` hiç `true` olmaz → personel **son sınava geçemez**
  (kendini ancak query refetch + yeniden tetikleme ile şanslıysa düzeltir; kırılgan).
- **Öneri:** mobil tamamlamayı web gibi **`onEnded`/`didJustFinish`** olayına bağla; eşik gerekiyorsa
  **≥ %90** yap. Heartbeat zaten `watchedTime`'ı yükselttiği için onEnded'de `completed:true` yeterli.

### 11.2 ✅ Feedback (EY.FR.40) akışı yok — **ÇÖZÜLDÜ (feat/feedback-form + feat/feedback-entry-points)**

> **Çözüm (2026-06-01):** `app/feedback/[attemptId].tsx` ekranı eklendi (`GET /api/feedback/form` +
> `POST /api/feedback/submit`, likert_5 / yes_partial_no / text soru tipleri). Giriş noktaları:
> start 423 → otomatik form, result `canSubmit` CTA, eğitim detayı CTA, trainings tab zorunlu banner.
> Aşağıdaki analiz tarihsel kayıt.

- Backend `start` → zorunlu feedback varsa **423 + pendingFeedback**; `submit` → `feedbackRequired:true`.
- Mobil 423'ü yakalıyor (`start.tsx`) ama **feedback formu ekranı yok** (`feedbackRequired` tipi tanımlı,
  kullanılmıyor). Zorunlu feedback'li eğitimde personel yeni sınav **başlatamaz, kilitlenir**.
- **Öneri:** `/exam/[id]/feedback` karşılığı mobil ekran: `GET feedback/[formId]/schema?attemptId=` +
  `POST .../submit`. `staff/feedback/pending` listesi de eklenebilir.

### 11.3 🟡 Tab-switch / AppState (K3)

- `submit` body'sinde `tabSwitchCount?` alanı var ama **hep undefined** (AppState dinleyici yok).
- Web'de de oto-fail yok (sadece loglanır) → güvenlik etkisi düşük, ama sadakat için `AppState`
  ('background' sayımı) eklenebilir.

### 11.4 🟡 No-seek

- Web ileri sarmayı engeller; mobil native kontrollerle serbest seek. Backend K1 (wall-clock) + %90
  tabanı kısmen telafi eder ama mobil ileri-sarmayı **görsel olarak** engellemiyor.
- **Öneri:** `expo-video` seek event'inde izin verilen son konuma geri sar (web `lastAllowedTime` portu).

### 11.5 ✅ Retry / expired-retryable / ek hak talebi nüansları — **ÇÖZÜLDÜ (feat/training-states)**

> **Çözüm (2026-06-01):** `isExpiredRetryable` tüketiliyor (sarı "ilerleme taşınmaz" banner + açık CTA),
> EXHAUSTED durumunda `attempt-requests` GET/POST ile ek hak talebi formu (pending/rejected durumları dahil).
> Aşağıdaki analiz tarihsel kayıt.

- Web detay sayfası RETRY_PENDING (2 adım), EXPIRED_RETRYABLE ("ilerleme taşınmaz" banner), hak bitince
  **ek hak talebi formu** gösterir. Mobil `trainings/[id].tsx`'in bu durumları tam karşılayıp
  karşılamadığı **doğrulanmalı** (özellikle `attempt-requests` çağrısı mobilde yok).

### 11.6 ⚪ Certificate `sign` — **TEYİT EDİLDİ: opsiyonel, çıkmaz sokak değil**

- Web'de geçen sonuçta imza adımı (`/sign`) var; mobil hiç çağırmıyor.
- **Teyit (2026-06-01, backend kodu):** Sertifika üretimi `submit` içinde async fire-and-forget;
  imza adımından **bağımsız**. İmzasız sertifika da üretilir → mobilde imza ekranı zorunlu değil.
  İleride istenirse `signatureMethod: 'acknowledge'` ile basit onay eklenebilir.

### 11.7 ⚪ Kapsam dışı (muhtemelen v1'de bilinçli) — teyit edilecek

Takvim, 360° Değerlendirmeler, Yetkinlik sonuçları, Feedback **listesi**, SMG menüleri mobilde yok.
K4 ekran-görüntüsü/kopya engeli yok. Bunlar v1 personel kapsamı kararıyla uyumluysa sorun değil.

### Özet tablo

| #   | Konu                                        | Web                                    | Mobil               | Durum                                | Öncelik |
| --- | ------------------------------------------- | -------------------------------------- | ------------------- | ------------------------------------ | ------- |
| 1   | Video tamamlama                             | onEnded + %90                          | playToEnd + %90     | ✅ Düzeltildi (#7)                   | —       |
| 2   | Feedback formu                              | var (423/feedbackRequired yönlendirir) | tam form + 4 giriş  | ✅ Düzeltildi (#8 + entegrasyon)     | —       |
| 3   | Tab-switch (K3)                             | sayılır                                | sayılmaz            | ⚠️ Kısmi (bilinçli ertelendi)        | 🟡      |
| 4   | No-seek                                     | engellenir                             | serbest (nötralize) | ⚠️ Kısmi (accumulator telafi ediyor) | 🟡      |
| 5   | Retry/ek-hak durumları                      | zengin                                 | tam durum makinesi  | ✅ Düzeltildi (#9)                   | —       |
| 6   | Certificate sign                            | var (opsiyonel)                        | yok                 | ⚪ Opsiyonel teyit edildi            | —       |
| 7   | Takvim/360°/yetkinlik/SMG                   | var                                    | yok                 | ⚪ kapsam dışı?                      | ⚪      |
| —   | start/questions/timer/submit/results/videos | —                                      | ✅ çalışıyor        | ✅                                   | —       |

---

## 12. 📱 Mobil Taşınabilirlik Notları (web → RN karşılıkları)

| Web                                  | RN karşılığı                                                   |
| ------------------------------------ | -------------------------------------------------------------- |
| `exam-state-machine.ts` (saf mantık) | TS portu — birebir kopyala (tek doğru kaynak)                  |
| `document.visibilitychange` (K3)     | `AppState` ('active'/'background')                             |
| Fullscreen API (examOnly post-exam)  | `expo-screen-orientation` (gerekiyorsa)                        |
| `localStorage`/`sessionStorage`      | `AsyncStorage` (sonuç cache), `expo-secure-store` (token)      |
| `BroadcastChannel` tab-lock          | **gereksiz** (mobil tek instance)                              |
| `navigator.sendBeacon`               | `fetch(..., { keepalive:true })` veya offline-queue mutation   |
| `<video>` + onEnded + no-seek        | `expo-video` + `didJustFinish`/`playToEnd` + seek geri-sarma   |
| `<audio>` + onProgressRef heartbeat  | `expo-video`/`expo-audio` + ref'li interval                    |
| SCORM iframe + SCORM 1.2 API         | web-only — mobilde kapsam dışı                                 |
| Cookie JWT                           | `Authorization: Bearer` + `expo-secure-store` (zaten yapılmış) |

---

## 13. Önerilen Sonraki Adımlar (kod değişikliği gerektirir — ayrı tur)

1. ~~**🔴 Video tamamlama düzelt**~~ ✅ Yapıldı (`fix/video-completion-90`): `playToEnd` → `completed:true`; eşik ≥%90.
2. ~~**🔴 Feedback ekranı ekle**~~ ✅ Yapıldı (`feat/feedback-form` + `feat/feedback-entry-points`): `app/feedback/[attemptId].tsx` + 4 giriş noktası.
3. ~~**🟡 `trainings/[id]` durum makinesini** web ile hizala~~ ✅ Yapıldı (`feat/training-states`): EXPIRED_RETRYABLE + EXHAUSTED + `attempt-requests`.
4. ~~**🟡 Certificate `sign`** zorunluluğunu teyit et~~ ✅ Teyit edildi: opsiyonel, sertifika üretiminden bağımsız — ekran gerekmiyor.
5. **🟡 K3 AppState** sayımı + no-seek geri-sarma (sadakat) — bilinçli ertelendi (web'de de sadece loglanıyor).
6. Her düzeltme için jest-expo testi + bu dökümanı güncel tut → **sıkılaştırma turu** (bkz. mobil-sikiilastirma-yol-haritasi.md M1).

> Bu doküman **harita + analiz**dir; kod değiştirmez. Yukarıdaki adımlar kullanıcı onayıyla
> ayrı turlarda uygulanır.
