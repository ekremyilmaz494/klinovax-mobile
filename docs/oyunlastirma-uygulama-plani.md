# KLINOVAX Gamification — Tam Uygulama Planı (Mobil)

> Hedef repo: `klinovax-mobile` (sadece mobil). Backend `../hospital-lms` ayrı repo, ekip tarafından değiştirilebilir. Bu plan TÜM kodu değil, dosya-dosya **uygulanabilir** bir yol haritası verir. Orta-seviye bir mühendis bunu doğrudan execute edebilmeli.
>
> İlgili: strateji & araştırma belgesi `docs/oyunlastirma-arastirma-ve-strateji.md`.

---

## 1. Genel bakış & prensipler

**Üç özellik (fazlı):**

1. **Günün Soruları** — Leitner spaced-repetition günlük quiz + günlük push + dashboard kartı. (En yüksek ROI.)
2. **Streak + Puan + Rozet** — server-saatli streak (auto-freeze), düşmeyen puan (status), rozet galerisi.
3. **Kutlama** — `AnimatedSplash` fork'u (reanimated-only, yeni native dep YOK) + opsiyonel `expo-haptics`, sadece nötr içerikte.

**Çekirdek prensipler (hard):**

- **Additive-only / gözlemci**: Korunan hiçbir akışa dokunulmaz. Puan ödülleri `result.tsx`/`scorm`/`feedback` ekranlarına **fire-and-forget, once-guard'lı yan etki** olarak eklenir; render'ı, `data.isPassed`'i, faz makinesini, no-seek'i, %90 tamamlamayı, timer'ı, 423 rollback'i, 401/refresh'i ASLA değiştirmez.
- **Server authoritative (anti-cheat)**: Puan/streak/rozet **sunucuda** hesaplanır. Mobil sadece **okur ve gösterir**; "award" çağrıları sunucuya event bildirir (best-effort), ama gerçek kredi sunucunun idempotent kararı. Streak günü **server clock** ile belirlenir (cihaz saati spoof'a açık).
- **Design-system (Warm Editorial)**: Shadow YOK → hairline (`t.hairline` + `t.colors.border.subtle`). Emoji YOK → `IconSymbol`/`IconDot`. Hardcoded renk/font YOK → token + `<Text variant>`. Sayılar `metric`/`metricSmall` (tabular-nums dahili) veya explicit `fontVariant:['tabular-nums']`. Layout-kritik sayıda `maxFontSizeMultiplier={1.6}`. Her animasyon `useReducedMotion()` ile gate. Light+dark zorunlu. `expo-blur`/`expo-linear-gradient` YASAK.
- **KVKK**: Onay zaten ilk girişte alınıyor (`app/kvkk.tsx`) → yeni onay akışı **YOK**. Tek kalıcı kural: **isimli bireysel public leaderboard YOK** → personal-best + departman/ekip agregası.
- **Offline**: Yeni read query'ler `PersistQueryClientProvider` ile otomatik persist olur (offline gösterim). Yeni mutation'lar (puan event'i) yalnız idempotent olduğu backend tarafından doğrulanırsa `PERSISTED_MUTATION_KEYS`'e eklenir; aksi halde `networkMode:'online'` best-effort.

---

## 2. Mimari diyagram (text)

```
                         ┌──────────────────────────────────────────────┐
                         │  hospital-lms (BACKEND, ayrı repo, §7)        │
                         │  /api/staff/daily/questions  (GET)            │
                         │  /api/staff/daily/submit     (POST)           │
                         │  /api/staff/gamification/summary (GET)        │
                         │  /api/staff/gamification/event   (POST)       │
                         │  cron: günlük "Günün Soruları" push           │
                         │  Drizzle: daily_review, point_ledger,         │
                         │           user_streak, badge, user_badge      │
                         └───────────────▲──────────────────────────────┘
                                         │ apiFetch<T> (Bearer JWT, 401/refresh otomatik)
                                         │
 MOBILE  ┌───────────────── lib/api ─────────────────┐
         │ daily.ts (NEW)        gamification.ts (NEW)│  ← exam.ts / attempt-requests.ts mirror
         │ schemas/daily.ts(NEW) schemas/gamification.ts(NEW) ← schemas/exam.ts mirror (looseObject)
         │ schemas/index.ts(validate, REUSE)          │
         └──────────────▲─────────────────▲───────────┘
                        │                 │
       types/daily.ts(NEW)  types/gamification.ts(NEW)  ← types/exam.ts mirror
                        │                 │
  lib/exam/spaced-repetition.ts (NEW, saf) ← video-completion.ts mirror
  lib/exam/__tests__/spaced-repetition.test.ts (NEW)   ← video-completion.test.ts mirror
                        │                 │
   hooks/use-daily-questions.ts (NEW)  hooks/use-gamification.ts (NEW) ← use-notifications.ts mirror
                        │                 │
  ┌─────────────────────┴─────────────────┴────────────────────────────┐
  │ EKRANLAR / UI                                                       │
  │  app/daily-quiz.tsx (NEW route)        ← questions.tsx option-row   │
  │  app/(tabs)/dashboard.tsx (EDIT: DailyQuizCard + StreakWidget)      │
  │  app/(tabs)/profile.tsx   (EDIT: Puan + Rozet galerisi)             │
  │  app/exam/[assignmentId]/result.tsx (EDIT: kutlama + award once)    │
  │  app/scorm/[trainingId].tsx (EDIT: award once)                      │
  │  app/feedback/[attemptId].tsx (EDIT: award once)                    │
  │  components/ui/CelebrationOverlay.tsx (NEW) ← AnimatedSplash fork    │
  │  components/dashboard/StreakWidget.tsx (NEW)                        │
  │  components/profile/BadgesGallery.tsx (NEW)                         │
  └────────────────────────────────────────────────────────────────────┘
                        │
  lib/notifications/handler.ts (EDIT: ALLOWED_PREFIXES += '/daily-quiz')
  lib/query/mutation-keys.ts (EDIT: gamificationEvent, submitDaily — sadece offline gerekirse)
  lib/query/mutation-defaults.ts (EDIT: yukarıdaki key'ler için setMutationDefaults)
  components/ui/icon-symbol.tsx (EDIT: 'flame.fill' + rozet SF Symbol'leri)
```

**Veri akışı (offline dahil):**

- **Read**: `useGamification()` / `useDailyQuestions()` → `apiFetch` → `validate(graceful)` → TanStack cache → AsyncStorage persist (24h). Offline'da cache'ten okunur ve gösterilir.
- **Write (event)**: `result.tsx` pass → once-guard `awardedRef` → `useMutation(MUTATION_KEYS.gamificationEvent)` → online ise hemen POST; offline ise (yalnız idempotent ise) paused → rehydrate + online'da `resumePausedMutations()` ile replay. Başarısızlık → `console.warn`, UI etkilenmez.

---

## 3. ÖZELLİK 1 — Günün Soruları

### a) Yeni dosyalar

| Yol                                            | Amaç                                                                                                        | Mirror                                                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/daily-quiz.tsx`                           | Hafif quiz ekranı (timer/no-seek/423 YOK). Soru kartı + seçenek satırı + sonuç özeti.                       | `app/exam/[assignmentId]/questions.tsx` **sadece** option-row JSX (satır 458-510) + `Map<questionId,optionId>` seçim state (181, 324-331). Timer/auto-submit/back-guard/anti-cheat **kopyalanmaz**. |
| `hooks/use-daily-questions.ts`                 | `useDailyQuestions()` query + `useSubmitDailyQuestions()` mutation. Dashboard kartının görünürlüğünü sürer. | `hooks/use-notifications.ts` tüm dosya: `KEY` const (11), `enabled:!!user` query (21-31), optimistic mutation (45-77).                                                                              |
| `lib/api/daily.ts`                             | `fetchDailyQuestions()` + `submitDailyAnswers(body)`, her biri `validate()` sarmalı.                        | `lib/api/attempt-requests.ts` (GET fetcher + POST mutator + JSDoc backend guard listesi).                                                                                                           |
| `lib/api/schemas/daily.ts`                     | `dailyQuestionsResponseSchema`, `dailySubmitResponseSchema` (graceful zod).                                 | `lib/api/schemas/exam.ts` (`z.looseObject`, `z.enum`).                                                                                                                                              |
| `types/daily.ts`                               | `DailyQuestion`, `DailyQuestionsResponse`, `DailySubmitResponse` (plain TS).                                | `types/exam.ts`.                                                                                                                                                                                    |
| `lib/exam/spaced-repetition.ts`                | Saf Leitner mantığı (aşağıda d).                                                                            | `lib/exam/video-completion.ts`.                                                                                                                                                                     |
| `lib/exam/__tests__/spaced-repetition.test.ts` | Birim test.                                                                                                 | `lib/exam/__tests__/video-completion.test.ts`.                                                                                                                                                      |

### b) Düzenlenecek dosyalar

**`app/(tabs)/dashboard.tsx`** — `{data ? (<View style={{ gap: t.space[6] }}>...` bloğunda, **`<StatsGrid stats={data.stats} />` (satır 130) hemen sonrası, "Genel ilerleme" progress bloğu (132) öncesi**:

```
{dailyQuiz?.available ? <DailyQuizCard data={dailyQuiz} /> : null}
```

- `DailyQuizCard`: **file-local function declaration** (UrgentCard precedent, satır 181-213) — ayrı `components/dashboard/` dosyası açma (henüz tek kullanım).
- Pattern: `Pressable onPress={() => router.push('/daily-quiz')}` + `accessibilityRole/Label` + pressed-opacity → `<Card variant="accent" rail>` → `<Text variant="overline">` (clay "GÜNÜN SORULARI") + `<Text variant="title-3" numberOfLines={2}>` + `<Stack direction="row" justify="space-between">` içinde `<Badge label={`${data.dueCount} soru`} tone="primary" />` + clay `<Text variant="subhead">Başla →</Text>`.
- Veri: dosya başında `const { data: dailyQuiz } = useDailyQuestions();` (mevcut `useQuery(['staff-dashboard'])` ve `['staff','profile']` yanına).

**`lib/notifications/handler.ts`** — `ALLOWED_PREFIXES` literal (satır 49, doğrulandı: `['/trainings/', '/exam/', '/certificates/']`):

```
const ALLOWED_PREFIXES = ['/trainings/', '/exam/', '/certificates/', '/daily-quiz'];
```

- Sadece bu prefix eklenir (open-redirect whitelist disiplini korunur). Backend günlük push'u `data.url: '/daily-quiz'` göndermeli.

### c) Yeni ekran/route

- **Expo Router yolu**: `app/daily-quiz.tsx` → route `/daily-quiz`. Tek dosya (dinamik segment yok). Tab eklenmez (5 tab dolu — `(tabs)/_layout.tsx` referans; 6. tab kalabalık yapar). Giriş noktaları: dashboard kartı + push deep-link.
- Ekran yapısı: `<Hero overline="GÜNLÜK TEKRAR" title="Günün Soruları" />`, soru kartı (`<Text variant="title-2">` soru + kopyalanan option-row), "Cevapla" → `useSubmitDailyQuestions().mutate()`, sonuç özeti (doğru/yanlış sayısı, Leitner kutu ilerlemesi `ProgressBar` ile). 423/timer/no-seek **yok**.

### d) Saf mantık: `lib/exam/spaced-repetition.ts`

> **Mimari karar**: Leitner planlaması **backend-driven** (sunucu "due" soruları döner, anti-cheat). Bu modül client tarafında **gösterim/yardımcı + senkron sabit kilidi** olarak kalır; gerçek due seçimi server. Modül backend ile **bit-bit aynı** kutu→aralık tablosunu tutar (regresyon kilidi).

JSDoc başı: WHY + "backend ile senkron tutulmalı" notu (video-completion.ts üst bloğu gibi). İmzalar (destructured options-object, inline tip, side-effect yok):

```ts
// Leitner kutu→aralık (gün) — backend point_ledger/daily_review ile senkron.
export const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35] as const; // kutu 0..5

export function nextBox({ currentBox, correct }: { currentBox: number; correct: boolean }): number; // doğru→+1 (max 5), yanlış→0

export function nextReviewDate({ box, from }: { box: number; from: Date }): Date; // from + LEITNER_INTERVALS_DAYS[box]

export function isDue({ nextReviewAt, now }: { nextReviewAt: Date; now: Date }): boolean; // now >= nextReviewAt

export function selectTodaysQuestions<T extends { nextReviewAt: Date }>({
  pool,
  now,
  limit,
}: {
  pool: T[];
  now: Date;
  limit: number;
}): T[]; // due olanları nextReviewAt asc sırala, limit kes
```

**Test (`spaced-repetition.test.ts`)** — video-completion.test.ts stili (relative import, Türkçe describe/it, tek-assertion):

- `nextBox`: doğru cevap kutuyu +1, kutu 5'te tavan (5'te kalır); yanlış → 0; idempotence/boundary.
- `nextReviewDate`: kutu 0 → aynı gün, kutu 1 → +1 gün, kutu 5 → +35 gün.
- `isDue`: tam sınır (`now === nextReviewAt` → true), öncesi false.
- `selectTodaysQuestions`: sıralama (en eski due önce), `limit` kesme, boş pool.
- **Regresyon kilidi**: `expect(LEITNER_INTERVALS_DAYS).toEqual([0,1,3,7,16,35])` (ANTI_CHEAT_WATCH_FLOOR kilidi gibi).

### e) Push hatırlatma (`lib/notifications`)

- **Token kaydı değişmez** (`push.ts` referans-only; `registerForPushNotifications` zaten tüm push'u kapsar). Günlük hatırlatma **backend cron** sorumluluğu (§7) — kayıtlı token'a `data.url:'/daily-quiz'` ile gönderir.
- `handler.ts`: prefix whitelist'e `/daily-quiz` eklendi (yukarıda b). Foreground handler değişmez.
- Opsiyonel: günlük hatırlatma için ayrı Android channel istenirse `push.ts` satır 68-75 `setNotificationChannelAsync` mirror'lanır; ama `'default'` channel yeterli → **eklenmez**.

### f) Offline davranışı

- `useDailyQuestions()` read query → otomatik persist (offline'da bugünün soruları cache'ten gösterilir).
- **Cevap submit kararı**: `useSubmitDailyQuestions()` → **online-only optimistic** (use-notifications mark-as-read gibi, `networkMode:'online'`). Gerekçe: günlük quiz cevabı zaman-hassas ve idempotent değilse offline replay risklidir. Eğer backend `submitDaily`'i idempotent (client-supplied attempt key) yaparsa, `MUTATION_KEYS.submitDaily` + `PERSISTED_MUTATION_KEYS` eklenip offline-resume'a alınabilir — bu §7 backend onayına bağlı.
- Persister exam-prefix exclusion'a dokunulmaz; `daily-questions` query'si normal persist olur.

### g) Tasarım: primitive'ler

- Kart: `<Card variant="accent" rail>` + `<Text variant="overline"/title-3/subhead>` + `<Badge>` + `<Stack>`.
- Quiz ekranı: option-row (clayMuted bg + clay 2px border seçili, hairline default; 34x34 Fraunces harf rozeti — questions.tsx kopyası), `<Text variant="body" weight={selected?'medium':'regular'}>`.
- İlerleme: `<ProgressBar value={0-100} />`. Buton: `<Button variant="primary">`. Boş durum: `<EmptyState>`.

---

## 4. ÖZELLİK 2 — Streak + Puan + Rozet

### a) Yeni dosyalar

| Yol                                     | Amaç                                                                                     | Mirror                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `hooks/use-gamification.ts`             | `useGamification()` query (streak/points/badges) — dashboard + profile tüketir.          | `hooks/use-notifications.ts` (`KEY=['gamification']`, `enabled:!!user`). |
| `lib/api/gamification.ts`               | `fetchGamificationSummary()` + `recordGamificationEvent(body)`.                          | `lib/api/attempt-requests.ts`. (§6 ile paylaşılır.)                      |
| `lib/api/schemas/gamification.ts`       | Graceful zod şemalar.                                                                    | `schemas/exam.ts`.                                                       |
| `types/gamification.ts`                 | `BadgeTier`, `Badge`, `StreakState`, `GamificationSummary`, `GamificationEventResponse`. | `types/exam.ts`.                                                         |
| `components/dashboard/StreakWidget.tsx` | Streak flame + sayaç + freeze rozeti.                                                    | UrgentCard `<Card variant="accent" rail>` + IconDot.                     |
| `components/profile/BadgesGallery.tsx`  | Wrap-grid rozet madalyonları (earned/locked).                                            | profile.tsx SectionTitle+Card wrapper + ThemeSelector wrap-row.          |

> Not: Streak/badge için **yeni design-system primitive YOK** — `Card + IconDot + Stack + Text + Tag` ile kompoze edilir (3+ ekran tekrarı yok). Sadece `components/dashboard/` ve `components/profile/` altında domain bileşeni.

### b) Düzenlenecek dosyalar

**`types/staff.ts`** — (doğrulandı: `DashboardStats` ve `StaffProfile.stats` gamification alanı içermiyor.) **Bu dosyaya alan EKLENMEZ**; bunun yerine ayrı `useGamification()` query/endpoint kullanılır (mevcut `['staff','profile']` cache key'i ve onun şemasını bozmamak için — scope disiplini). Böylece dashboard/profile mevcut query'leri etkilenmez.

**`app/(tabs)/dashboard.tsx`** — data-gated content View'ın **ilk child'ı** olarak (`<MandatoryFeedbackBanner/>`, satır 127 öncesi), uniform `t.space[6]` gap ile:

```
{gamification ? <StreakWidget streak={gamification.streak} /> : null}
```

- `StreakWidget`: `<Card variant="accent" rail>` + `<Stack direction="row" align="center" gap={2}>` → `<IconDot variant="accent" icon="flame.fill" size={28}>` + `<Text variant="metric" maxFontSizeMultiplier={1.6}>{streak.current}</Text>` + `<Text variant="overline">GÜNLÜK SERİ</Text>`. Freeze aktifse `<Tag label="donduruldu" tone="info" />`. "Genel ilerleme" Stack row (132-149) styling mirror'lanır.
- Veri: `const { data: gamification } = useGamification();`.

**`app/(tabs)/profile.tsx`** — mevcut **"Gelişimim" section'ı (satır 217-222)** gamification'ın semantik evi:

- **Puan**: "Gelişimim" Card'ına yeni `LinkRow` veya stats card'a (183-200) ek kolon → `<StatCard label="Puan" value={gamification.points} tone="info" />` (StatCard doğrudan reuse; metric variant + tabular-nums dahili). Puan **asla düşmez** (status göstergesi) — kopyada "puanların düşmez" mikro-copy.
- **Rozet galerisi**: "Gelişimim" sonrası (satır 222 sonrası), "Belgelerim" (224) öncesi yeni `SectionTitle('Rozetlerim')` + local Card wrapper + `<BadgesGallery badges={gamification.badges} />`.
- `BadgesGallery`: `<Stack direction="row" wrap gap={3}>` → her rozet `<IconDot variant={earned?'accent':'neutral'} icon={badge.icon} size={40} filled={badge.earned} />` + altında `<Text variant="caption">`. Locked = `filled={false}` (ring-only, gri).
- Pattern: SectionTitle (325-335) + Card wrapper (337-352) + StatCol (354-374, inline Fraunces_700Bold kabul edilen metric pattern).

**`components/ui/icon-symbol.tsx`** — MAPPING (doğrulandı: `'flame.fill'` YOK; `'star.fill':'star'`, `'checkmark.seal.fill':'verified'`, `rosette`, `sparkles`, `'graduationcap.fill'` var). `'star.fill'` (satır 60) sonrasına ekle:

```
'flame.fill': 'local-fire-department',
'trophy.fill': 'emoji-events',
'medal.fill': 'military-tech',
```

- iOS (`icon-symbol.ios.tsx`) passthrough — değişiklik yok; bu isimler geçerli SF Symbol.
- **Rozet ikonları (SF Symbol → MaterialIcons)**: mevcutlardan reuse → `checkmark.seal.fill` (madalya/mühür), `rosette` (ödül), `star.fill`, `graduationcap.fill`, `sparkles`; yeni → `flame.fill`, `trophy.fill`, `medal.fill`. Her yeni isim MAPPING'de olmalı (IconSymbolName türü buradan türüyor).

### c) Yeni ekran/route

- Gerekmez. Streak → dashboard widget; puan + rozet → profile. (İleride adanmış rozet ekranı istenirse `app/badges.tsx` + `<Hero>`; şimdilik kapsam dışı.)

### d) Saf mantık modülü

- Streak/puan **server-side** hesaplanır → ayrı saf modül **şart değil**. Tek yardımcı (opsiyonel): rozet eşiği gösterim formatlama (örn. "bir sonraki rozete X puan") → `lib/gamification/format.ts` (saf, test'li) — yalnız UI metni, mantık değil. **Streak server-clock vurgusu**: cihaz saatiyle streak hesaplama YOK; `streak.current`/`freezesLeft`/`atRisk` sunucudan gelir.

### e) Push

- Streak-risk hatırlatması = backend cron (§7), `data.url:'/daily-quiz'` veya `/trainings/...`. Mobil değişiklik yok (prefix zaten whitelist'te).

### f) Offline

- `useGamification()` read → persist (offline gösterim; "stale puan" UX sorunu yok çünkü puan düşmez, monoton artar).
- Puan event'i write → §6 (gamificationEvent), idempotency'ye bağlı offline-resume.

### g) Tasarım: primitive'ler

- `Card(accent/rail)`, `IconDot(flame/badge)`, `Tag`, `StatCard`, `ProgressBar` (bir sonraki rozete ilerleme), `Stack(wrap)`, `Text(metric/metricSmall/overline/caption)`. Puan/streak `metric`/`metricSmall` (tabular-nums). Locked rozet `filled={false}` + `variant="neutral"`.

---

## 5. ÖZELLİK 3 — Kutlama

### Fork detayı

**Yeni dosya `components/ui/CelebrationOverlay.tsx`** — `components/ui/AnimatedSplash.tsx` **fork'u** (import değil, kopya — splash timing/onFinish bozulmasın). Yeni native dep YOK (`react-native-reanimated ~4.1.1` zaten var; `expo-blur`/`expo-linear-gradient` YASAK).

Kopyalanan mimari (AnimatedSplash satır referansları):

- Dual `useSharedValue`: `t` (one-shot 0→1 timeline) + `loop` (twinkle/drift) — satır 51-53.
- `Ring` (108-133), `Sparkle` (135-168), `Mote` (179-204), deterministik seeded `MOTES(W,H)` (207-226, `Math.random` YOK).
- Sadece transform + opacity worklet'leri (`'worklet'` direktifi), UI thread.
- Renkler `Palette`/theme token'ından (hex YOK). Başarı tonu: `status.success` (sage) — nötr başarı; clay sekonder.
- **`useReducedMotion()` gate VERBATIM** (satır 47, 56-63, ve her `!reduce && ...` render guard 93/96/97/102). Reduce Motion açıkken → tüm hareket atlanır, sadece kısa fade. (CLAUDE.md §7 zorunlu.)
- `runOnJS(onFinish)` withTiming completion callback'inde (58-61/69-72). Karar: **auto-dismiss** (one-shot, onFinish sonrası overlay unmount) — kullanıcı CTA'sını bloklamaz.

Props: `<CelebrationOverlay onFinish />` — absolute positioned, `pointerEvents="none"` (altındaki butonlar tıklanabilir kalsın).

### Nereye bağlanır

**`app/exam/[assignmentId]/result.tsx`** (EDIT):

- `const passed = data.isPassed;` (satır 69) — **okunur, değiştirilmez**.
- Kutlama: success hero `<View>` bölgesi (89-125) içinde **`{passed ? <CelebrationOverlay onFinish={...} /> : null}`** — fail branch görsel olarak el değmeden kalır. `data.isPassed`/`passingScore`/`attemptsRemaining`/gating değişmez.
- Award once: mevcut `invalidatedRef` mount effect (26-34) yanında **`awardedRef`-guarded, `passed`-keyed** effect → `recordGamificationEvent({type:'exam_pass', attemptId})` fire-and-forget; hata → `console.warn` (logout `unregisterPushToken` best-effort pattern). Render'ı bloklamaz/throw etmez.

**`app/scorm/[trainingId].tsx`** (EDIT):

- Award once: `finishCompletion` body sonu, **`markCompleted();` (satır 109) hemen sonrası** — `completedUiRef` zaten exactly-once garantiler. `recordGamificationEvent({type:'training_complete', trainingId})` fire-and-forget.
- Opsiyonel kutlama: `phase === 'completed'` View (270-296), checkmark (279) yakınında `<CelebrationOverlay>`. `flushPatch`/debounce/PATCH mutation/`completionSeenRef`/grace-timer/`onMessage` lesson_status **dokunulmaz**.

**`app/feedback/[attemptId].tsx`** (EDIT):

- Award once: `onSubmitted` (95-103) içinde, dört `qc.invalidateQueries` sonrası, Alert (100) civarı → `recordGamificationEvent({type:'feedback_submit', attemptId})`. Hem `onSuccess` (63) hem 409 branch (66-69) buraya akar → tek insertion once-only. Error branch'lere (404/429/0/400) **eklenmez**; `networkMode:'online'`/`canSubmit`/`buildFeedbackPayload` değişmez.

### Nötr-içerik kuralı

- Kutlama **sadece nötr içerikte**: sınav geçme (`passed`), eğitim tamamlama (scorm), sertifika. **ASLA** hasta-güvenliği içeriğinde (Günün Soruları'nda confetti **yok** — burada hafif `ProgressBar` ilerleme yeterli; ileride istenirse ürün kararı). Feedback award'ı kutlama tetiklemez (sadece puan event'i).
- `app/(tabs)/certificates.tsx` ayrı pass gerektirir (bu görevde okunmadı) — yeni sertifika görüntülemede kutlama istenirse ayrı PR.

### expo-haptics opsiyonu

- **Yeni native dependency** → OTA ile yayınlanamaz; **zorunlu yeni EAS build + store submission** (CLAUDE.md OTA kuralı). Bu yüzden **Faz 3'te ayrı, opsiyonel** ele alınır:
  - Eklenirse: `npx expo install expo-haptics` → `Haptics.notificationAsync(Success)` kutlamada, **`useReducedMotion()` ile birlikte gate** (reduce motion = haptik de yok) + `Platform`/cihaz desteği kontrolü.
  - Eklenmezse: kutlama haptiksiz tamamen fonksiyonel (reanimated-only). **Varsayılan: önce haptiksiz ship et** (OTA-able), haptik sonraki native build'e bırakılır.

---

## 6. Ortak altyapı

| Dosya                             | Tür   | Ne                                                                                                                                                                                                                                                                         | Mirror                                                                             |
| --------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `lib/api/gamification.ts`         | NEW   | `fetchGamificationSummary(): Promise<GamificationSummary>` (GET) + `recordGamificationEvent(body): Promise<GamificationEventResponse>` (POST). Her biri `apiFetch<T>` → `validate(schema, data, "gamification.x")`. Üst JSDoc backend guard'larını (4xx/409/429) listeler. | `lib/api/attempt-requests.ts` (GET+POST+JSDoc) / `exam.ts:36-39` validate sarmalı. |
| `lib/api/daily.ts`                | NEW   | `fetchDailyQuestions()` + `submitDailyAnswers(body)`.                                                                                                                                                                                                                      | aynı.                                                                              |
| `lib/api/schemas/gamification.ts` | NEW   | `gamificationSummaryResponseSchema`, `gamificationEventResponseSchema` — `z.looseObject` (forward-compat), `z.enum` status, sadece load-bearing alanlar; free text `z.string()`.                                                                                           | `schemas/exam.ts` (looseObject + discriminatedUnion).                              |
| `lib/api/schemas/daily.ts`        | NEW   | `dailyQuestionsResponseSchema`, `dailySubmitResponseSchema`.                                                                                                                                                                                                               | aynı.                                                                              |
| `types/gamification.ts`           | NEW   | `BadgeTier='bronze'\|'silver'\|'gold'`, `Badge{id,icon:IconSymbolName,tier,earned:boolean,earnedAt?}`, `StreakState{current,longest,freezesLeft,atRisk}`, `GamificationSummary{points,streak,badges[]}`, `GamificationEventResponse`. TS source-of-truth, zod mirror'lar.  | `types/exam.ts` (union, discriminated).                                            |
| `types/daily.ts`                  | NEW   | `DailyQuestion{questionId,prompt,options[],box}`, `DailyQuestionsResponse{available,dueCount,questions[]}`, `DailySubmitResponse{correctCount,results[]}`.                                                                                                                 | aynı.                                                                              |
| `lib/api/schemas/index.ts`        | REUSE | `validate()` graceful pass-through — **değiştirilmez**. Tüm yanıtlar sarılır; fallback consumer-side `?? default` (zod default uygulanmaz).                                                                                                                                | —                                                                                  |

**`lib/query/mutation-keys.ts`** (EDIT — yalnız offline-resume gerekirse; doğrulandı yapı: MUTATION_KEYS objesi + MutationKey union + PERSISTED_MUTATION_KEYS Set):

- `gamificationEvent: ['gamification','event'] as const` → MUTATION_KEYS'e (patchScorm sonrası); union'a `| typeof MUTATION_KEYS.gamificationEvent`; Set'e `MUTATION_KEYS.gamificationEvent.join('/')`.
- (Opsiyonel) `submitDaily: ['daily','submit'] as const` — yalnız backend idempotent ise.
- **Kritik**: mevcut key STRING'leri **asla** yeniden adlandırılmaz (AsyncStorage persisted mutation'ları bozar; buster bump gerekir). Sadece append. Read-only summary key gerektirmez.

**`lib/query/mutation-defaults.ts`** (EDIT):

- `GamificationEventVars` tipi (PatchScormVars sonrası) tanımla.
- `registerMutationDefaults` sonuna `client.setMutationDefaults(MUTATION_KEYS.gamificationEvent, { mutationFn: (v: GamificationEventVars) => recordGamificationEvent(v), networkMode:'offlineFirst', retry: shouldRetry, onSuccess: () => void client.invalidateQueries({queryKey:['gamification']}), onError: (e) => { if (isAlreadyProcessedError(e)) void client.invalidateQueries({queryKey:['gamification']}); } })` — mevcut `shouldRetry` + `isAlreadyProcessedError` reuse; createAttemptRequest bloğu (181-198) mirror. Yorum: "replay-safe, backend idempotent (dedup key)".
- `_layout.tsx` **değişmez** — registry mount öncesi kayıtlı, paused mutation rehydrate + `resumePausedMutations()` otomatik replay.

**`lib/query/persister.ts`** (REUSE): değişmez. Yeni key Set'e eklenince persister otomatik onurlandırır. `gamification`/`daily-questions` read query'leri normal persist (exam- exclusion'a takılmaz).

> **Idempotency uyarısı (en büyük risk)**: `gamificationEvent` `PERSISTED_MUTATION_KEYS`'e **yalnızca** backend replay'de çift-kredi vermiyorsa (client-supplied dedup/idempotency key) eklenir. Aksi halde `networkMode:'online'` best-effort kalır, persist edilmez. → §7'de backend'den net cevap istenir.

---

## 7. BACKEND istek listesi (hospital-lms ekibine)

> Server authoritative: puan/streak/rozet **sunucuda** hesaplanır. Mobil event'i bildirir ama kredi sunucunun idempotent kararı. Streak günü **server clock**. İsimli public leaderboard **YOK** (KVKK) → departman agregası.

### Endpoint'ler

**1. `GET /api/staff/daily/questions`**

- Req: query yok (JWT'den staff). Resp:

```json
{
  "available": true,
  "dueCount": 5,
  "serverDate": "2026-06-21",
  "questions": [
    {
      "questionId": "q1",
      "prompt": "...",
      "box": 2,
      "options": [{ "optionId": "a", "text": "..." }]
    }
  ]
}
```

- Sunucu Leitner due seçimini yapar (anti-cheat). `LEITNER_INTERVALS_DAYS=[0,1,3,7,16,35]` mobil sabitiyle senkron.

**2. `POST /api/staff/daily/submit`**

- Req: `{ "submissionId":"<client-uuid>", "answers":[{"questionId":"q1","optionId":"a"}] }` (submissionId = idempotency/dedup key).
- Resp: `{ "correctCount":4, "pointsAwarded":40, "results":[{"questionId":"q1","correct":true,"newBox":3,"nextReviewAt":"2026-06-24"}] }`
- Idempotent: aynı `submissionId` tekrarında kredi **bir kez**.

**3. `GET /api/staff/gamification/summary`**

```json
{
  "points": 1240,
  "streak": { "current": 7, "longest": 21, "freezesLeft": 2, "atRisk": false },
  "badges": [
    {
      "id": "first_pass",
      "tier": "bronze",
      "icon": "checkmark.seal.fill",
      "earned": true,
      "earnedAt": "..."
    },
    { "id": "streak_30", "tier": "gold", "icon": "flame.fill", "earned": false }
  ]
}
```

- `icon` değerleri mobil IconSymbol MAPPING'de mevcut SF Symbol isimleri olmalı.

**4. `POST /api/staff/gamification/event`**

- Req: `{ "eventId":"<client-uuid>", "type":"exam_pass"|"training_complete"|"feedback_submit", "refId":"<attemptId|trainingId>" }`
- Resp: `{ "ok":true, "pointsAwarded":50, "newBadges":["streak_30"] }`
- **Idempotent** (eventId dedup) — offline replay çift-kredi vermesin. **Bu netleşmezse mobil tarafta persist edilmez.**
- Sunucu puanı gerçek event'ten doğrular (mobil "trust"lanmaz; örn. exam_pass'i kendi `attempt.isPassed` kaydından teyit eder).

### Drizzle tabloları (öneri)

- `daily_review(staff_id, question_id, box int, next_review_at timestamptz, last_result bool, updated_at)` — PK (staff_id, question_id).
- `point_ledger(id, staff_id, event_type, ref_id, points int, dedup_key unique, created_at)` — append-only, puan asla düşmez (sum = toplam).
- `user_streak(staff_id PK, current int, longest int, last_active_date date, freezes_left int)` — günlük cron server-clock ile günceller.
- `badge(id, tier, icon, threshold_json)` + `user_badge(staff_id, badge_id, earned_at)` — PK (staff_id, badge_id).

### Cron'lar

- **Günlük "Günün Soruları" push** (örn. 09:00 kurum TZ): due'su olan staff'a Expo push, `data.url:'/daily-quiz'`. Mevcut kayıtlı token (`/api/staff/push/expo/register`) kullanılır.
- **Streak bakım/freeze** (gece): aktif olmayan günde `freezes_left`>0 ise freeze tüket (streak korunur), yoksa sıfırla. `atRisk` flag set. Opsiyonel streak-risk push.

### Idempotency & anti-cheat

- Tüm POST'lar client-supplied dedup key (`submissionId`/`eventId`) ile idempotent.
- Puan event-doğrulamalı (sunucu kendi kaydından teyit eder; mobil-bildirilen puanı kabul etmez).
- Streak server-clock (cihaz saati yok sayılır).

### Mevcut endpoint'lere geriye-uyumlu opsiyonel alanlar

- **Tercih edilen yaklaşım: ayrı `summary` endpoint** (mevcut `/api/staff/profile` ve `/api/staff/dashboard` response'larını **değiştirme** — mobil `types/staff.ts` ve `['staff','profile']`/`['staff-dashboard']` cache'i bozulmasın).
- Eğer agregasyon istenirse: dashboard'a **opsiyonel** `gamification?: {...}` alanı eklenebilir (looseObject zaten yutar) ama net ayrım için ayrı endpoint önerilir.

---

## 8. Test & doğrulama planı

**Yeni `__tests__`:**

- `lib/exam/__tests__/spaced-repetition.test.ts` — §3d case'leri (nextBox, nextReviewDate, isDue boundary, selectTodaysQuestions, interval regresyon kilidi).
- (Opsiyonel) `lib/gamification/__tests__/format.test.ts` — "sonraki rozete X" formatlama.
- Mevcut exam test suite'i **değişmeden** yeşil kalmalı (regresyon kanıtı — additive olduğun ispatı).

**Her commit öncesi (CLAUDE.md gate):**

```
npm run typecheck && npm run lint && npm test
```

Üçü de yeşil olmadan "tamamlandı" denmez.

**Manuel görsel/erişilebilirlik (her PR):**

- **Light + dark** (Cmd+Shift+A): DailyQuizCard, StreakWidget, BadgesGallery, CelebrationOverlay her iki temada.
- **Reduce Motion** açık: CelebrationOverlay sadece kısa fade; ProgressBar withTiming atlanır; quiz fonksiyonel.
- **Dynamic Type AX1/AX3**: puan/streak `metric` sayıları `maxFontSizeMultiplier={1.6}` ile layout kırmıyor.
- **Offline**: airplane mode → dashboard cache'ten gamification/daily gösterir; online'a dönünce (idempotent ise) event replay olur.
- **Push deep-link**: `/daily-quiz` tap → ekran açılır (whitelist çalışıyor); whitelist dışı URL hâlâ reddediliyor (Sentry warning).

---

## 9. Fazlama & sıra

### Faz 1 — Günün Soruları (en yüksek ROI)

- **Mobil**: `spaced-repetition.ts` + test, `types/daily.ts`, `schemas/daily.ts`, `lib/api/daily.ts`, `hooks/use-daily-questions.ts`, `app/daily-quiz.tsx`, dashboard `DailyQuizCard`, `handler.ts` prefix.
- **Backend bağımlılığı**: endpoint 1+2, daily cron. Mobil, backend stub/mock ile başlayabilir; `validate()` graceful olduğu için şema mismatch app'i kırmaz.
- **En yüksek-ROI ilk PR (küçük, mergeable)**:
  1. `lib/exam/spaced-repetition.ts` + `__tests__` (saf, backend'siz, hemen test edilebilir).
  2. `types/daily.ts` + `schemas/daily.ts` + `lib/api/daily.ts` + `hooks/use-daily-questions.ts`.
  3. `app/daily-quiz.tsx` + dashboard `DailyQuizCard` + `handler.ts` prefix.
  - Bu PR tek başına çalışır (backend hazır olunca veri akar), korunan hiçbir şeye dokunmaz. `tsc && lint && test` yeşil.

### Faz 2 — Streak + Puan + Rozet

- **Mobil**: `types/gamification.ts`, `schemas/gamification.ts`, `lib/api/gamification.ts`, `hooks/use-gamification.ts`, `icon-symbol.tsx` (flame/trophy/medal), `StreakWidget` (dashboard), `BadgesGallery` + puan (profile).
- **Backend bağımlılığı**: endpoint 3, point_ledger/user_streak/badge tabloları, streak cron.

### Faz 3 — Kutlama + award event'leri

- **Mobil**: `CelebrationOverlay.tsx` (AnimatedSplash fork), `result.tsx`/`scorm`/`feedback` award once-guard, `MUTATION_KEYS.gamificationEvent` + `mutation-defaults`.
- **Backend bağımlılığı**: endpoint 4 (idempotent). expo-haptics → ayrı native build PR (OTA değil).
- Sıra: önce award event'leri (puan akışı tamam), sonra görsel kutlama (haptiksiz, OTA-able), en son opsiyonel haptik (native build).

---

## 10. Riskler & açık noktalar

1. **Offline replay çift-kredi (en büyük risk)**: `gamificationEvent`/`submitDaily` backend'de idempotent (dedup key) değilse → `PERSISTED_MUTATION_KEYS`'e **eklenmez**, `networkMode:'online'` best-effort kalır. Backend onayı şart (§7).
2. **`isAlreadyProcessedError` 409/422 yutuyor** — gamification "zaten claim edildi" için farklı kod dönerse (`mutation-defaults.ts`), per-call `onError` ile genişletilir.
3. **Backend API yolları kesinleşmedi** — `lib/api/daily.ts`/`gamification.ts` yazılmadan hospital-lms path'leri teyit edilmeli (bu repo mobil-only).
4. **Leitner: client mı server mı** — karar: **backend-driven** (anti-cheat). `spaced-repetition.ts` gösterim + sabit-kilit'e küçülür; backend değişirse interval tablosu senkron tutulmalı.
5. **Daily submit offline mı** — varsayılan online-only optimistic (use-notifications gibi); offline-resume yalnız idempotent ise.
6. **DailyQuizCard file-local mi promote mi** — UrgentCard precedent → file-local başla; ikinci ekran kullanırsa `components/dashboard/`'a taşı.
7. **Streak/puan placement** — streak dashboard hero altı ilk card (önerilen); puan profile "Gelişimim". Ürün onayı.
8. **`types/staff.ts`'e alan eklememe kararı** — ayrı `gamification/summary` endpoint tercih edildi; backend mevcut profile/dashboard response'unu değiştirmemeli (cache + şema scope koruması).
9. **Locked rozet stili** — `IconDot filled={false}` + `variant="neutral"` (gri ring). Teyit edilecek.
10. **expo-haptics native build** — eklenirse OTA çözmez; ayrı EAS build + submission. Varsayılan: haptiksiz ship.
11. **buster bump** — gamification cache şeması launch öncesi oynaksa `persister.ts` buster (`v1.0.0`, app.json'a manuel senkron) bump kararı.
12. **Sertifika kutlaması** — `app/(tabs)/certificates.tsx` bu görevde okunmadı; yeni sertifika görüntülemede kutlama istenirse ayrı pass.
13. **Nötr-içerik disiplini** — kutlama yalnız exam pass / training complete / certificate; hasta-güvenliği / Günün Soruları içeriğinde confetti yok.
