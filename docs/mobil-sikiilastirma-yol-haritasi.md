# Mobil App Sıkılaştırma (Hardening) Yol Haritası

> **Amaç:** `klinovax-mobile`'ı "küçük bir değişiklik bile sessizce kırmasın, çökerse uygulama
> komple düşmesin" seviyesine getirmek. Bu doküman **yalnızca plan**dır — kod değiştirmez.
> Uygulama, kullanıcı onayıyla ayrı turlarda yapılır.
>
> **Test yaklaşımı (karar):** Birim + mantık testi — `jest` + `@testing-library/react-native`
> (E2E/Detox şimdilik kapsam dışı).
>
> İlgili: [web-personel-egitim-akisi-haritasi.md](./web-personel-egitim-akisi-haritasi.md) (§11 boşluk analizi).

---

## 1. Sıkılaştırma nedir — iki ayrı eksen

| Eksen                            | Soru                                   | Araç                                                  |
| -------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| **(a) Değişikliği yakalayan ağ** | "Bir değişiklik mantığı bozdu mu?"     | **Testler** + CI gate + TS strict                     |
| **(b) Çökmeye dayanıklılık**     | "Bir şey patlarsa kullanıcı ne görür?" | ErrorBoundary, Sentry, offline-replay, server-otorite |

Repoda (b)'nin yarısı var; (a)'nın **kalbi (testler) hiç yok**. Bir sınav akışında en tehlikeli
kırılma **sessiz** olandır (puanlama/tamamlama bozulur ama app çökmez) — onu sadece testler yakalar.

---

## 2. Mevcut Durum (ölçülmüş)

| Katman                                           | Durum                                                    |
| ------------------------------------------------ | -------------------------------------------------------- |
| TypeScript `strict`                              | ✅ açık (`tsconfig.json`)                                |
| ESLint + Prettier + CI gate                      | ✅ (`expo lint`, `format:check`)                         |
| Husky pre-commit + commitlint + lint-staged      | ✅ (`.husky/`)                                           |
| CI: typecheck / lint / format / expo-doctor      | ✅ (`.github/workflows/ci.yml`)                          |
| EAS build/submit pipeline                        | ✅                                                       |
| Offline-first mutation replay + TanStack persist | ✅ (`lib/query/`)                                        |
| Server-otorite (timer/puan/anti-cheat)           | ✅ (web ile ortak backend)                               |
| **Otomatik test**                                | ✅ jest-expo, 13 suite / 159 test + CI test job (PR #14) |
| **Global ErrorBoundary**                         | ✅ kök + exam boundary, Sentry'e raporlar (PR #13)       |
| **Sentry**                                       | ⚠️ kurulu + boundary wiring hazır, DSN üretimde pasif    |
| API yanıtı runtime doğrulama (zod)               | ✅ exam yanıtları, graceful pass-through (PR #12)        |

> CI artık tip + stil + **mantık** regresyonunu yakalar: `lib/exam/` saf fonksiyonları (video %90 eşiği,
> timer auto-submit, 423 rollback, start routing) test altında. Mantığı bozan PR merge edilemez.

---

## 3. Katman 1 — Güvenlik Ağı (test altyapısı + exam-flow testleri) 🔴

### 3.1 Altyapı kurulumu

- **Preset:** `jest-expo` (Expo'nun resmi jest preset'i; RN + Expo modüllerini transform eder).
- **Kütüphaneler:** `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`
  (matcher'lar). DevDependency olarak.
- **Mock'lar:** `expo-video`, `expo-secure-store`, `expo-notifications`,
  `@react-native-async-storage/async-storage` (resmi mock), `fetch` (API client testleri için),
  `@react-navigation` / `expo-router` (navigation spy).
- **Script:** `package.json` → `"test": "jest"`, `"test:watch": "jest --watch"`,
  `"test:cov": "jest --coverage"`.
- **Klasör:** her modülün yanında `__tests__/` (web repo konvansiyonuyla uyumlu).

### 3.2 Öncelikli test matrisi (en yüksek getiri → en düşük)

| #   | Hedef                           | Dosya                                   | Neyi doğrular                                                                                           |
| --- | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **Video tamamlama mantığı**     | `app/exam/[assignmentId]/videos.tsx`    | onEnded/eşikte `completed:true` gönderiliyor, **backend %90 tabanıyla uyumlu** (§11.1 regresyon kilidi) |
| 2   | **Timer expiry → oto-submit**   | `app/exam/[assignmentId]/questions.tsx` | süre 0 → tam bir kez `submit` tetiklenir, çift tetik yok                                                |
| 3   | **Cevap kaydet + 423 rollback** | `questions.tsx`                         | post-exam 30sn sonrası 423 → yerel state geri alınır, uyarı gösterilir                                  |
| 4   | **start durum-route'lama**      | `app/exam/[assignmentId]/start.tsx`     | her `status` ve **423 pendingFeedback** doğru ekrana gider                                              |
| 5   | **Offline mutation replay**     | `lib/query/mutation-defaults.ts`        | saveAnswer/submit/completeVideo offline kuyruğa girer, online'da idempotent replay                      |
| 6   | **Auth refresh tek-uçuş**       | `lib/api/client.ts`                     | 401 → tek eşzamanlı refresh, başarıda retry, auth-fail'de logout                                        |
| 7   | **API client (exam)**           | `lib/api/exam.ts`                       | her endpoint doğru method/path/body, hata tipleri                                                       |
| 8   | **Sonuç gating**                | `app/exam/[assignmentId]/result.tsx`    | kaldıysa soru detayı gizli (anti-cheat sadakati)                                                        |
| 9   | **(varsa) state machine portu** | bkz. §3.3                               | tüm geçişler + geçersiz geçiş reddi                                                                     |

**Hedef coverage:** kritik akış dosyaları için ≥ %80 (web repo kuralıyla aynı). Genel zorunlu değil,
ama exam-flow için sıkı.

### 3.3 Öneri: state machine'i porta çek

Web'in tek doğru kaynağı `apps/web/src/lib/exam-state-machine.ts`. Mobil şu an durumu doğrudan
sunucu `status`'una göre route'luyor (kendi makinesi yok). Bu mantığı saf bir `lib/exam-state.ts`
olarak portlamak → hem test edilebilir hem web ile **bit-bit aynı** olur (ıraksama riski biter).

### 3.4 CI değişikliği

`.github/workflows/ci.yml`'a yeni job:

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm }
    - run: npm ci
    - run: npm test -- --ci --coverage
```

Böylece **mantığı bozan PR merge edilemez.** (Opsiyonel: `lint-staged`'a hızlı `jest --findRelatedTests`.)

---

## 4. Katman 2 — Çökmeye Dayanıklılık 🔴

1. **Global ErrorBoundary.**
   - Expo Router: kök `app/_layout.tsx` için `ErrorBoundary` export'u + ekran-bazlı `error.tsx`
     karşılığı. Bir render/JS hatası → beyaz ekran yerine "Bir şeyler ters gitti, tekrar dene"
     kurtarma ekranı.
   - Özellikle **exam ekranları** kendi sınır bileşeniyle sarılmalı (sınav ortasında çökme →
     kullanıcıyı kaybetmeden son duruma dönebilme).
2. **Sentry DSN aktivasyonu** (üretim).
   - DSN env'i etkinleştir; ErrorBoundary yakaladığı hatayı Sentry'e göndersin. Çökmeleri
     göremezsen "sağlam" olduğunu da bilemezsin.
   - Kaynak haritası (sourcemap) upload'ı EAS build adımına bağlanmalı.
3. **API hata yüzeyi tutarlılığı.**
   - `ApiError` zaten var; 401/403/423/429/5xx için kullanıcıya **Türkçe**, iç-detay sızdırmayan
     mesajlar. 423 (feedback/kilit) ve 429 (rate-limit, Retry-After) için özel UX.

---

## 5. Katman 3 — Mevcut Doğrulanmış Riskleri Kapat 🟡

(Harita §11'den — bunlar zaten kırık/eksik; sıkılaştırmanın parçası, ama kod gerektirir.)

1. **Video tamamlama** → `onEnded`/`didJustFinish` tabanlı (eşik ≥%90). _Test #1 bunu kilitler._
2. **Feedback ekranı** → `app/exam/[assignmentId]/feedback.tsx` + `staff/feedback/pending`.
3. **Retry / expired-retryable / ek hak talebi** → `trainings/[id].tsx` durum makinesini web ile hizala
   - `attempt-requests` çağrısı.
4. **Certificate `sign`** → zorunlu mu teyit; gerekiyorsa imza ekranı.
5. **K3 AppState** sayımı + **no-seek** geri-sarma (sadakat).

---

## 6. Katman 4 — Runtime Sınır Doğrulama (zod) 🟡

- Backend yanıtları `zod` şemalarıyla parse edilsin (`lib/api/*`).
- Fayda: backend şekil değiştirirse **sessiz `undefined` patlaması** yerine kontrollü, loglanan hata.
- Şemalar web'deki tiplerden türetilebilir; mobil tipleri (`types/exam.ts`) ile tek kaynak.

---

## 7. Uygulama Sırası (milestone'lar — her biri ayrı tur, sonunda onay)

| Tur    | İçerik                                                                        | Çıktı                        | Durum                                                                       |
| ------ | ----------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| **M1** | jest-expo + RNTL kurulum, mock'lar, ilk 3 test (video/timer/423), CI test job | "Güvenlik ağı" devreye girer | ✅ PR #14                                                                   |
| **M2** | Kalan exam-flow testleri (#4-#8) + (varsa) state machine portu + testi        | Akış mantığı kilitlenir      | ✅ PR #14 (state machine portlandı, ekrana entegre değil)                   |
| **M3** | Global ErrorBoundary + exam sınır bileşeni + Sentry DSN                       | Çökmeye dayanıklılık         | ✅ PR #13 — **Sentry DSN aktivasyonu hâlâ bekliyor** (ops adımı, CLAUDE.md) |
| **M4** | §11 riskleri kapat (video onEnded, feedback ekranı, retry durumları)          | Sadakat + doğruluk           | ✅ Önceki tur (PR #7-#11)                                                   |
| **M5** | zod runtime guard + (ops.) E2E değerlendirmesi                                | Sınır sertleştirme           | ✅ PR #12 (E2E kapsam dışı bırakıldı)                                       |

---

## 8. Doğrulama (her tur sonunda)

- `npm run typecheck` temiz · `npm run lint` temiz · `npm test` yeşil · CI 5 job da geçer.
- Yeni/değişen exam-flow dosyası → ilgili test güncel (yoksa CI uyarısı).
- ErrorBoundary: bir ekrana kasıtlı throw enjekte edilip kurtarma ekranı + Sentry kaydı gözlemlenir.
- Bu doküman ve harita dökümanı, davranış değiştikçe güncel tutulur.

---

### Özet

Repo **disiplini iyi** (strict TS, CI, lint, husky, EAS). Eksik olan tek şey, sıkılaştırmanın
**asıl yarısı**: mantığı koruyan **testler** ve çökmeyi yakalayan **ErrorBoundary/Sentry**. Bu ikisi
girince "küçük değişiklik sessizce kırar" riski büyük ölçüde kapanır. Başlangıç için en yüksek getiri:
**M1 (test altyapısı + ilk 3 exam-flow testi + CI test job).**

---

## 9. Derinlemesine Denetim Turu (2026-06-04) — Sonuç

Uçtan uca kod-seviyesi denetim yapıldı (exam akışı, auth/refresh, offline, ikincil ekranlar,
design-system + a11y). **Sonuç: çekirdek sağlam.** Doğrulanmış 🔴 Kritik / 🟠 Yüksek hata YOK.
İnceleme ajanlarının "kritik" işaretlediği çoğu bulgu gerçek kod okunduğunda false-positive çıktı
(timer çift-submit, video cache stale-bleed, biyometrik clock-skew, mid-exam re-lock, answer-lock
döngüsü — hepsi `dosya:satır` ile çürütüldü). Detay rapor: planlama dosyası `lovely-discovering-sprout.md`.

**Uygulanan minör düzeltmeler (branch `fix/audit-minor-findings`, hepsi test+typecheck+lint yeşil):**

- **F1** — Ölü bağımlılıklar kaldırıldı: `@supabase/supabase-js` + `react-hook-form` (sıfır kaynak
  import). ⚠️ **Bağımlılık ağacı değişti → yeni EAS build + smoke test önerilir** (OTA tek başına yetmez).
- **F3** — `result.tsx` soru-detay React key'i `index` tabanlı (soru metni substring yerine).
- **F4** — 429 `Retry-After` parse edilip kullanıcıya "X sn sonra dene" gösteriliyor
  (`client.ts: parseRetryAfterSeconds` + `ApiError.retryAfter`; test: `lib/api/__tests__/retry-after.test.ts`).
- **EK1** — `result.tsx` hero skoruna `maxFontSizeMultiplier={1.6}` (AX3'te taşma önlemi).
- **EK2** — Sertifika/transkript paylaşımı: `Sharing` yoksa sessiz `return` yerine açık hata fırlatılıyor
  (çağıran `Alert` gösteriyor; sessiz başarısızlık giderildi).

**Kasıtlı olduğu için DOKUNULMAYAN (do-no-harm):** `phase-redirect` 'post-exam' → detay yönlendirmesi
(testle kilitli, redirect-loop önler); biyometrik "günde bir" politikası; zod graceful pass-through;
logout best-effort push-unregister; reaktif (proaktif değil) token refresh.

**Backend teyidi bekleyen (mobil değişmedi):** login `mustChangePassword`/`setupCompleted` —
mobil `!res.session` ile güvenli tarafta blokluyor; backend'in bu hallerde session vermediği varsayımı
doğrulanmalı.
