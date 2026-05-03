# CLAUDE.md — klinovax-mobile

> **Bu dosya Claude Code'un proje hafızasıdır.** Bu dizinde çalışırken otomatik olarak context'e yüklenir. Buradaki kuralları **mutlaka uygula**, default davranışları **override eder**.

---

## Proje

**klinovax-mobile** — Türkçe medikal eğitim/sertifikasyon iOS+Android uygulaması (Klinovax). Hastane personeli için zorunlu eğitim atamaları, video izleme, sınav (pre + post), sertifikasyon, push hatırlatmalar.

- **Backend**: kardeş repo `../hospital-lms` (Next.js + Drizzle + Supabase). Bu repoda **sadece** mobil kod.
- **Hedef kullanıcı**: Hastane personeli (hekim, hemşire, teknisyen) — Türkçe UI. Kurum yöneticisi (admin) bu app'i kullanmaz, web panelinde çalışır.
- **Dağıtım**: EAS Build (development/preview/production), Expo Updates ile OTA.
- **Bundle ID**: `com.klinovax.app`.

---

## Stack

| Katman | Seçim |
|---|---|
| Runtime | React Native 0.81 + Expo SDK 54 + React 19 + new architecture |
| Routing | Expo Router 6 (file-based, typed routes) |
| Diller | TypeScript 5 (strict), JSX |
| State | Zustand (`store/auth.ts` — tek store, sadece auth) |
| Server state | TanStack Query v5 + AsyncStorage persistence + paused mutations |
| Auth | Custom JWT (access+refresh) → `expo-secure-store`, biometrik kilit `expo-local-authentication` |
| Push | `expo-notifications` (development build gerekli, Expo Go'da çalışmaz) |
| Media | `expo-video` (yeni player API), `react-native-webview` (PDF) |
| Animasyon | `react-native-reanimated` v4 (worklets, UI thread) |
| Fontlar | `@expo-google-fonts/fraunces` + `@expo-google-fonts/inter-tight` (expo-font ile yüklenir) |

---

## Tasarım sistemi: Warm Editorial

> **Felsefe**: dergi tipografisi + sıcak sand/clay paleti + hairline border'lar. **Asla shadow değil, hairline.** Asla emoji değil, IconSymbol.

### Renk paleti (özet)

```
Light                              Dark
surface.canvas    #F5F1EA          #15130F
surface.primary   #FBF8F2          #1F1C17
text.primary      #1B1A17          #F0E9DA
accent.clay       #C2410C (clay-600) #E07A45 (clay-400)
status.success    sage-700          sage-400
status.danger     ember-700         ember-400
```

Tam palet: `design-system/tokens.ts` (Palette, Radius, Space, Hairline, Motion).
Semantik tema: `design-system/theme.ts` (`useTheme()` hook, `lightTheme`, `darkTheme`).

### Tipografi

- **Display/Title**: Fraunces (variable, italic destekli) — başlıklar, brand, metric değerler
- **Body**: Inter Tight — gövde, label, button, caption
- **Mono**: Menlo (iOS) / monospace (Android) — sertifika kodu

Variant ölçeği: `display`, `title-1/2/3`, `headline`, `body`, `bodyEmph`, `callout`, `subhead`, `footnote`, `caption`, `overline`, `mono`, `metric`, `metricSmall` — `design-system/typography.ts`'de.

**Önemli**: `<Text variant="title-2">` kullan; doğrudan `fontFamily`/`fontSize` SADECE timer, brand veya istisnai durumlarda override et.

### Primitives — bunları kullan, JSX'te raw `<View>` minimum

```tsx
import { Text, Surface, Card, Button, Stack, Divider, Tag, Chip, IconDot, Hero, useTheme } from '@/design-system'
```

| Primitive | Kullanım |
|---|---|
| `<Text variant="..." tone="..." />` | TÜM metin (başlık, body, caption hepsi) |
| `<Card variant="default\|accent\|warning\|success\|danger" rail>` | Kartlar — `rail` sol accent strip |
| `<Button variant="primary\|ghost\|danger\|outline" size="sm\|md\|lg">` | Tüm CTA — Pressable + reanimated scale yapma manuel |
| `<Stack direction="row\|column" gap={n} />` | Flex container — boilerplate öldür |
| `<Tag tone="..." outlined?>` | Pill etiket (Badge alias'ı geriye uyum için) |
| `<Chip selected onPress>` | Filtre chip'i — clay seçili, hairline default |
| `<IconDot variant="..." size={20\|24\|28} numeral?>` | Aktivite/step daireleri (✓✗• emoji ASLA) |
| `<Hero overline title subhead>` | Ekran üstü başlık bloğu |

### Kurallar (hard rules)

1. **Shadow ASLA**: `Shadow.card`/`raised` token'ı YOK. Yüzey ayrımı için `borderWidth: t.hairline` + `borderColor: t.colors.border.subtle` kullan.
2. **Emoji ASLA**: `✓✗•🔒` yerine `<IconSymbol name="checkmark.circle.fill" />` veya `<IconDot>`. SF Symbols → Material fallback `components/ui/icon-symbol.{tsx,ios.tsx}` MAPPING'inde.
3. **Hardcoded renk YOK**: `#C2410C` yerine `t.colors.accent.clay`. Yeni renk gerekirse önce `tokens.ts` + `theme.ts`.
4. **Hardcoded font YOK**: Sadece tek istisna timer/brand'de Fraunces direkt — bunlar zaten `Text variant` ile sarılmıştır.
5. **Tabular-nums**: Timer, sertifika kodu, metrik için `fontVariant: ['tabular-nums']` (iOS prop). Fraunces'te no-op olabilir (tnum axis yok), Inter Tight'ta çalışır.
6. **`maxFontSizeMultiplier`**: Layout-kritik metinde (timer, top-bar progress) Dynamic Type'ı 1.6 ile sınırla.
7. **`useReducedMotion`**: Tüm reanimated animasyonlarında `useReducedMotion()` ile gate. Yeni animasyon eklerken accessibility açıksa skip et.
8. **Light + Dark zorunlu**: Her PR her iki temada da test edilmeli (Cmd+Shift+A simulator'da).

### Aurora background pattern

`components/auth/AuroraBackground.tsx` — login ekranı için animated soft orbs. Yeni ekrana koyma; auth flow'a özel premium hissi. Performans: sadece transform + opacity, UI thread worklets.

---

## Mimari

```
app/
├── _layout.tsx                # font + NavigationTheme + Stack defaults + AuthGate + LockOverlay + BadgeSync
├── index.tsx                  # boş redirect target
├── (auth)/
│   └── login.tsx              # email + password + biometric offer + AuroraBackground
├── (tabs)/
│   ├── _layout.tsx            # tab bar (Warm Editorial: hairline top, clay active)
│   ├── dashboard.tsx          # acil eğitim, 2×2 stats, progress, upcoming, activity timeline
│   ├── trainings.tsx          # filter chips + training kartları
│   ├── certificates.tsx       # letterhead kart + mono cert kodu
│   ├── notifications.tsx      # filter (Tümü/Okunmamış) + read/unread + mark all
│   └── profile.tsx            # avatar (initials), stats, biometric toggle, logout
├── trainings/[id].tsx         # eğitim detay + step listesi
├── exam/[assignmentId]/
│   ├── start.tsx              # sınav öncesi onay + kurallar
│   ├── questions.tsx          # timer + options + auto-submit (pre VE post)
│   ├── videos.tsx             # video player + heartbeat + PDF + completion
│   └── result.tsx             # dramatik yüzde + başarı/başarısızlık
├── certificates/[id]/preview.tsx  # PDF WebView modal
└── legal/[slug].tsx           # gizlilik/şartlar WebView

components/
├── auth/                      # BiometricLockScreen, AuroraBackground
├── network/                   # OfflineBanner
├── notifications/             # NotificationCard, NotificationTypeIcon
└── ui/                        # StatCard, Badge (=Tag alias), ProgressBar, EmptyState, ScreenError, IconSymbol, collapsible

design-system/
├── tokens.ts                  # Palette, Radius, Space, Hairline, Motion
├── theme.ts                   # SemanticColors, lightTheme, darkTheme, useTheme()
├── typography.ts              # Type variants
├── fonts.ts                   # FontMap (useFonts), FontFamily (sembolik isim)
├── useReducedMotion.ts        # AccessibilityInfo wrapper
└── primitives/                # Text, Surface, Card, Button, Stack, Divider, Tag, Chip, IconDot, Hero

lib/
├── api/
│   ├── client.ts              # apiFetch + apiRequest + 401 refresh + setOnAuthFailure
│   ├── exam.ts                # exam endpoint helper'ları
│   ├── cert-download.ts       # sertifika PDF paylaşımı
│   └── notifications.ts       # bildirim endpoint'leri
├── auth/
│   ├── secure-token.ts        # SecureStore session CRUD
│   ├── biometric.ts           # LocalAuthentication wrapper
│   ├── biometric-flag.ts      # AsyncStorage on/off flag
│   └── biometric-policy.ts    # ne zaman prompt
├── notifications/
│   ├── push.ts                # Expo push token register/unregister
│   ├── handler.ts             # foreground display + tap routing
│   └── badge.ts               # iOS app icon badge sync
├── query/
│   ├── persister.ts           # AsyncStorage persister
│   ├── mutation-defaults.ts   # offline-resume mutation registry
│   ├── mutation-keys.ts       # mutation key sabitleri
│   └── online-bridge.ts       # NetInfo → onlineManager bridge
├── network/use-online.ts      # NetInfo hook
├── format/time-ago.ts         # Türkçe relative time
└── config.ts                  # API_BASE_URL resolution

store/auth.ts                  # Zustand: user, hydrated, unlocked, hydrate/setSession/lock/unlock/logout

hooks/
├── use-color-scheme.{ts,web.ts}
├── use-notifications.ts       # useNotifications, useUnreadCount, useMarkAllAsRead
└── use-pending-mutation-count.ts
```

---

## Auth akışı

### State machine

```
hydrated=false
  ↓ (mount, secure-store load)
hydrated=true
  ├─ user==null  → AuthGate redirect → /(auth)/login
  └─ user!=null
      ├─ unlocked==false → BiometricLockScreen overlay
      └─ unlocked==true  → /(tabs)/dashboard
```

### 401 + refresh

`lib/api/client.ts:apiRequest`:
1. Bearer token ile fetch.
2. 401 → `performRefresh` (concurrent 401'lerde tek inflight).
3. Refresh `{ ok: true; token }` → orijinal isteği yeni token ile retry.
4. Refresh `{ ok: false; reason: 'auth' }` → SecureStore temizle + `onAuthFailure()` (Zustand logout) + 401 throw.
5. Refresh `{ ok: false; reason: 'network' }` → **session koru**, 0 statuslu network ApiError throw. Offline'da zorla logout YOK.

### `setOnAuthFailure(callback)` pattern

`app/_layout.tsx:AuthGate`'te:
```tsx
useEffect(() => {
  setOnAuthFailure(logout)
  return () => setOnAuthFailure(null)
}, [logout])
```

Bu sayede client.ts UI/store'u bilmez; bridge tek noktadan. Yeni `apiFetch` callsite eklerken 401 handler ekstra şart değil — auth-failure global temizliyor. **Ama** ekran-level refresh ihtiyaçları için her query'de `useEffect(() => { if (error?.status === 401) void logout() }, [error, logout])` pattern'i hâlâ doğru (defensive sync).

### Logout

`store/auth.ts:logout`:
1. `unregisterPushToken()` — bearer hâlâ geçerliyken (clearSession'dan ÖNCE). Hata `console.warn`.
2. `clearSession()` — SecureStore.
3. `set({ user: null, unlocked: true })` — store reset.
4. `_layout.tsx`'teki `wasAuthedRef` effect → `queryClient.clear()` + `clearPersistedQueryCache()`.

---

## TanStack Query / offline persistence

- **Persister**: `AsyncStorage` + max 24 saat cache + 30 sn stale.
- **PersistQueryClientProvider**: `_layout.tsx`'te `persistOptions` ile sarmal.
- **Paused mutations**: `registerMutationDefaults(client)` mount'tan ÖNCE çağrılır (createQueryClient içinde). Offline iken yapılan mutation'lar AsyncStorage'a paused yazılır; rehydrate + online döndüğünde `resumePausedMutations()` ile auto-replay.
- **Mutation keys**: `lib/query/mutation-keys.ts`'te merkezi (saveAnswer, submitExam, completeVideo, vb.).
- **Online bridge**: `setupOnlineBridge()` NetInfo'yu `onlineManager`'a bağlar.

---

## Konvansiyonlar

### Dosya organizasyonu
- Ekrana özel bileşenler: ekran dosyası içinde (örn. `dashboard.tsx`'in altındaki `UpcomingItem`, `ActivityItem`).
- Domain-genel bileşenler: `components/<domain>/` (örn. `components/notifications/NotificationCard.tsx`).
- Generic UI: `components/ui/` (StatCard, ProgressBar, vb.) — design-system tüketicisi.
- Hiçbir zaman "components/Common" gibi muğlak klasör.

### Naming
- Türkçe UI metinleri (TR), İngilizce kod (EN). Comment'ler karma — tercihen TR (kullanıcı TR konuşuyor).
- Ekran component'i default export, alt component'ler named export değil — local function declaration.
- Type'lar: `types/` altında merkezi (`staff.ts`, `notifications.ts`, `exam.ts`).

### Stil
- Inline style yerine `useTheme()` + token. `StyleSheet.create` zorunlu değil, modern RN'de inline style memo'lanır.
- Spacing: `t.space[1..16]` (4pt scale). 4-8-12-16-20-24-32-40-48-64.
- Radius: `t.radius.{sm,md,lg,xl,pill}`.

### Comment pattern
- **HER ZAMAN açıkla**: NEDEN (gizli kısıt, race condition, "bu şu yüzden böyle"). Kod ne yaptığını söyler — comment niçinini söyler.
- **ASLA açıklama**: ne yaptığını (`// fetch user` kötü), şu anki task'ı (`// added for issue #123`), caller listesi (`// used by X`).
- Türkçe yazılabilir, kısa olsun.

### Tasks / kod yorumları
- TODO'larda ne yapılacağı + neden + kim/ne zaman bilgisi olsun, yoksa yazma.
- Geriye uyum yorumu (`// removed`, `// deprecated`) yazma — git history zaten var.

---

## Komutlar

```bash
# Dev server (iOS simulator)
npx expo start --ios -c          # cache temizle ile

# Tip + lint
npx tsc --noEmit
npx expo lint

# EAS builds
npm run eas:dev:ios              # development build (push çalışır)
npm run eas:preview:ios          # internal distribution
npm run eas:prod                 # production (iOS + Android)

# Yeni font ekle
npx expo install @expo-google-fonts/<name>
# Sonra design-system/fonts.ts'e ekle
```

---

## Don'ts (yapma)

1. ❌ Hardcoded renk (#hex) — token kullan.
2. ❌ Hardcoded font / fontSize — `<Text variant="...">` kullan.
3. ❌ Shadow — hairline border kullan.
4. ❌ Emoji UI — IconSymbol/IconDot kullan.
5. ❌ `console.log` production'da — `console.warn` mantıklı sebeple OK, debug log'ları sil.
6. ❌ `any` type — `unknown` + narrow et.
7. ❌ `useEffect` dep array atlamak — eslint-disable çok dikkatli, ref pattern tercih et.
8. ❌ AsyncStorage'a token koymak — SecureStore zorunlu.
9. ❌ Yeni Zustand store yaratmak — server state TanStack, client state mevcut store yeterli.
10. ❌ `expo-blur` veya `expo-linear-gradient` ekleme — şu an bağımlılık yok, gerekiyorsa önce sor.
11. ❌ Backend kodu değiştirme — bu repo SADECE mobile. Backend hospital-lms'te.
12. ❌ Push notification test'i Expo Go'da — development build gerekli, simulator token alamaz.

---

## Do's (yap)

1. ✅ `useTheme()` her component'in başında — ondan sonra style.
2. ✅ Yeni component → primitives'in altında dene; gerçekten yeni primitif gerekiyorsa `design-system/primitives/` altına.
3. ✅ Test refactor: `tsc --noEmit && expo lint` her commit'ten ÖNCE.
4. ✅ Light + dark görsel test: simulator'da Cmd+Shift+A.
5. ✅ Dynamic Type test: AX1 ve AX3 layout'u kırmamalı.
6. ✅ Reduce Motion test: animasyonlar kapalı durumda da işlevsel.
7. ✅ Yeni endpoint → `lib/api/<domain>.ts` altında named function. `apiFetch<T>(path)` döner.
8. ✅ Yeni mutation → `useMutation` + `mutationKey` (`MUTATION_KEYS`'te tanımlı), offline persistence için `mutation-defaults.ts`'e mutationFn register.

---

## Bilinen tuzaklar

- **Expo Go push limitations**: SDK 53+ Expo Go push notification çalışmaz; development build kullan.
- **Simulator push token**: `Simulator/emulator — token alınamaz` warning normal; gerçek cihaz gerekli.
- **Fast Refresh + module-level state**: API client'ta `refreshInflight` module-scope; Fast Refresh sırasında reset olabilir, normal davranış.
- **Reanimated worklets**: `useAnimatedStyle` callback'inde `'worklet'` direktifi opsiyonel ama ileride Math fonksiyonları için ekle.
- **`fontVariant: ['tabular-nums']` Fraunces'te**: tnum OpenType feature yok, iOS sessizce yok sayar. Inter Tight'ta çalışır. Timer'da minor jitter normal.
- **NewArch enabled**: `app.json:newArchEnabled=true` — Fabric/TurboModules. Eski paketleri eklerken uyumluluk kontrol et.

---

## Critical files (sık dokunulan)

- `lib/api/client.ts` — auth, refresh, error handling
- `app/_layout.tsx` — root layout, providers, auth gate
- `store/auth.ts` — Zustand auth state
- `design-system/theme.ts` + `tokens.ts` — renk/spacing/radius
- `design-system/primitives/Card.tsx` + `Button.tsx` + `Text.tsx` — en kritik primitives
- `app/exam/[assignmentId]/questions.tsx` — sınav UX (timer, options, submit)
- `app/exam/[assignmentId]/videos.tsx` — video player + heartbeat + completion

---

## Referans / external

- Backend repo: `../hospital-lms` (Next.js + Drizzle + Supabase)
- Memory dosyaları (Claude'un user memory'sinde): `~/.claude/projects/-Users-ekremyilmaz-code/memory/klinovax-mobile.md`
- Design inspiration: `https://github.com/rohitg00/awesome-claude-design` (Warm Editorial ailesi)
- Plan dosyası (geçici, tamamlandı): `~/.claude/plans/https-github-com-rohitg00-awesome-claude-joyful-quill.md`
