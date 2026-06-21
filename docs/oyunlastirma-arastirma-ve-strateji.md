# KLINOVAX Oyunlaştırma Stratejisi — Karar Belgesi

> Kaynak: çok-ajanlı derin araştırma (5 kod tabanı haritası + 6 web araştırma açısı + 6 iddia doğrulama).
> Tarih: 2026-06-21. İki harici AI raporu + bağımsız web araştırması + bu reponun kod tabanı analizi birleştirilerek üretildi.

## 1. Yönetici özeti

Klinovax'a oyunlaştırmayı **ince bir motivasyon katmanı** olarak öneriyoruz; ürünün özü değil. Asıl yatırım, kanıt gücü en yüksek **öğrenme bilimi mekaniklerine** gitmeli: aralıklı tekrar (spaced repetition) ile pekiştirme quiz'leri, güven temelli işaretleme (confidence-based marking — yanlışı kendinden emin bilen klinisyeni tespit), ve kişisel ilerleme/seri (streak) takibi. Bunlar mevcut `lib/exam/` saf-mantık + `__tests__` desenine, push altyapısına (`lib/notifications/push.ts`) ve TanStack Query offline-resume hattına (`lib/query/mutation-defaults.ts`) korunan sınav faz makinesine **dokunmadan** bağlanır. **En büyük risk**, hastane personeli arasında bireysel/kamuya açık liderlik tablosu (leaderboard) koymaktır: KVKK açısından açık rıza geçersiz (işveren-çalışan güç dengesizliği, Kurul 2020/404), etik açıdan işbirliğini ve morali bozar, ve novelty (yenilik) etkisi 1-2 yılda eriyip negatife döner. Öneri: rekabet yerine **takım/birim hedefleri + kişisel-en-iyi**, ödül yerine **yeterlilik geri bildirimi**, ve hastalarla ilgili kritik içeriğin (hasta güvenliği, enfeksiyon) **konfeti/puan ile ödüllendirilmemesi**.

## 2. İddia denetimi

Yapıştırılan iki rapordaki büyük sayılar büyük oranda **abartı veya yanlış atıf**. Bunları paydaşlara tekrarlamayın.

| İddia                                                                                                                     | Hüküm                            | Gerçekte ne diyor                                                                                                                                                                                                                                                                    | Kaynak                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Oyunlaştırma + aralıklı tekrar uzun vadeli bilgi tutumunu **%170** artırır (Etiyopya / 20+ klinik RCT)                    | **Yanlış atıf (uydurma sayı)**   | "%170" hiçbir hakemli kaynakta yok; yalnız satıcı blogları "yaklaşık %200/%300" diyor, o da kendi platform analitiklerinden. Etiyopya ve "20+ RCT" çapraz-bağlama; Kerfoot RCT'leri Boston, etki büyüklüğü ~1.0/0.73. 2024 JMIR meta-analizi sadece **küçük** etki buldu (SMD 0.38). | jmir.org/2024/1/e57760; pubmed 17209889                |
| İnteraktif karar verme tutumu pasif videoya göre **%90** artırır                                                          | **Yanlış atıf (efsane)**         | Bu, çürütülmüş "Öğrenme Piramidi" (NTL/Edgar Dale) miti; ampirik dayanağı yok, yuvarlak 5/10/.../90 sayıları uydurma. Gerçek kanıt (Freeman 2014, PNAS): aktif öğrenme ~0.47 SD (~6 puan), %90 değil.                                                                                | tandfonline 2331186X.2018.1518638; pnas 1319030111     |
| Axonify **~%83 günlük** etkileşim oranına ulaşıyor                                                                        | **Yanlış atıf (kadans hatası)**  | %83 gerçek ama Axonify'ın kendi tanımıyla "**haftada 2-3 kez** giriş" — yani haftalık katılım, günlük değil. Bağımsız doğrulama yok, satıcı pazarlaması.                                                                                                                             | axonify.com/platform; axonify.com/use-cases/engagement |
| UCSD Health AI güven temelli öğrenmeyle zorunlu eğitim süresini **%75** azalttı, yüzlerce tehlikeli hekim önyargısı buldu | **Kısmen destekli**              | %75 gerçek ama yalnızca **Epic EHR onboarding** eğitimi için; "zorunlu eğitim" geneli değil. 577 vaka "önyargı" değil "**Confidently Held Misinformation**" (kendinden emin yanlış bilgi). Yöntem satıcı Amplifire'a ait, UCSD'nin kendi AI'si değil. Satıcı-bildirimli rakamlar.    | amplifire.com (KLAS case study); prnewswire            |
| Fiziksel/gerçek ödül eklemek etkileşimi **~%15** artırdı (Axonify)                                                        | **Kısmen destekli**              | %15 gerçek ve doğru atıflı ama **satıcının kendi müşteri gözlemi** ("among our own clients"); metodoloji, örneklem, kontrol grubu yok. Hakemli değil, sağlığa özel değil.                                                                                                            | axonify.com/blog/how-to-use-gamification               |
| Relias kullanan hastanelerde hemşire devri düştü, readmisyon **%50'ye kadar** düştü                                       | **Kısmen destekli (çoklu hata)** | "%50" tek bir SNF (Villa Healthcare, %21→%11 ≈ %48) vaka çalışması, kontrol grubu yok, hakemli değil. Hastane değil, bakım evi. Devir rakamları **başka müşterilerden** (örn. %20 retention), aynı kurum değil. Gamification'a bağlanması kanıtsız.                                  | relias.com/why-relias/measurable-outcomes              |

**Çıkarım:** Stakeholder'a "kanıta dayalı" mesajı verirken yalnızca şu meşru zemine yaslanın: aralıklı tekrar bilgi tutumunu **orta-büyük** ölçüde artırır (Clinical Teacher 2026 meta-analizi SMD 0.78, n=21.415); oyunlaştırma **bilgi ve katılımı** artırır ama **klinik davranışı** değiştirdiği kanıtlanmamıştır (JMIR 2019: 30 çalışmanın 25'i yüksek bias, pool edilemedi); ve etki **zamanla erir** (kısa müdahale ES 1.57 → 1-2 yıl ES −0.20).

## 3. Rakipler ne yapıyor — mekanik düzeyde damıtım

Pazarlamayı soyup gerçek motoru çıkarınca, sağlık/edu liderleri **aynı çekirdek** etrafında birleşiyor:

**Mekanik 1 — Kısa günlük retrieval seansı (en tutarlı çekirdek).** Axonify günde 3-5 soru / ~3 dk (360k+ çalışan, ~4M seansla ayarlanmış "sweet spot"); Qstream "günde 3 dakika". Her sorudan sonra **anında açıklamalı geri bildirim** (testing effect). Algoritma neyi tekrar göstereceğine **kullanıcı değil sistem** karar verir.

**Mekanik 2 — Aralıklı tekrar / ustalıkta-emeklilik.** Qstream: soru ancak N kez doğru cevaplanınca "emekli" olur, yanlışlar kısa aralıkla geri döner. SC Training: SM-2 algoritmalı "Brain Boost" yanlış slaytları yeniden sunar. Bu **tek başına en güçlü kanıta sahip** mekanik (Leitner → SM-2 → FSRS evrimi).

**Mekanik 3 — Güven temelli işaretleme (CBM).** Gardner-Medwin (UCL): öğrenci C=1/2/3 güven seçer; doğruda +1/+2/+3, yanlışta 0/−2/−6. "Misinformed" (yanlış + emin) çeyreğini cerrahi olarak ayırır — klinikte tam da tehlikeli olan hata türü. UCSD/Amplifire bunu kullanıyor.

**Mekanik 4 — Seri (streak) + kayıp-kaçınma.** Duolingo'nun "tek en etkili tutundurma kaldıracı". Günlük eşik aşılınca artar, kaçırılınca sıfırlanır — ama **streak freeze** (2-5 adet, sessiz otomatik tüketilir) cezayı yumuşatır. Freeze, 7+ gün serisi ortalamasını ~%48 yükseltmiş.

**Mekanik 5 — Çift para birimi / performans ile ödülün ayrılması.** SC Training: Scores (performans, liderlik tablosu) ≠ Stars (harcanabilir). Docebo: puan asla azalmaz (statü), coin azalır (harcama). Relias: coin'ler modül + **yüksek sınav skorundan** kazanılır (tıklamadan değil — sistemi oynamayı zorlaştırır).

**Mekanik 6 — Liderlik tablosu (en riskli).** Hepsinde var ama en tehlikeli ithalat. Sağlıklı kullanım: **takım/birim ölçekli**, küçük kohort (~30), **zaman pencereli** (haftalık/aylık reset), "yakın-sıra" gösterimi. Docebo saatlik yeniden hesaplama + zaman-pencereli tablo'yu "reset" olarak kullanır.

**Ortak ders:** Engelleyici mekanikleri (Duolingo "hearts"/can sistemi, prize-draw/kumar tadında çekilişler) **zorunlu klinik eğitime** koymayın. Bunlar tüketici uygulamaları için; hastane için yeterlilik + uyumluluk çerçevesi gerekir.

## 4. Klinovax için ÖNERİLEN oyunlaştırma mimarisi

Katmanlı. Her mekanik için: ne işe yarar / kanıt / Klinovax bağlantısı (gerçek dosya) / client mi backend mi / tasarım sistemi / offline.

### Katman A — Öğrenme bilimi çekirdeği (en yüksek ROI, "oyun" değil)

**A1. Pekiştirme modu — aralıklı tekrar quiz'leri ("Bilgi Pekiştirme")**

- **Ne işe yarar:** Eğitim tamamlandıktan sonra zayıf/yanlış cevaplanan soruları günlere yayarak yeniden sorar; unutma eğrisine karşı. Tamamen **opsiyonel ve geri-bildirim-zengin**, zorunlu pre/post sınavdan ayrı.
- **Kanıt:** En güçlü. Clinical Teacher 2026 meta-analizi SMD 0.78 (n=21.415); Qstream'in 20+ Kerfoot RCT'si tam da klinisyenlerde (6/18/24 ay durabilite).
- **Klinovax bağlantısı:** Yeni saf modül `lib/exam/spaced-repetition.ts` (Leitner kutu mantığı: doğru→üst kutu, yanlış→Kutu 1) + `lib/exam/__tests__/`. Soru bankası mevcut sınav altyapısından beslenir. Tetik: `lib/notifications/push.ts` günlük nudge + dashboard `app/(tabs)/dashboard.tsx`'e "Günün Soruları" kartı. Faz makinesine, `video-completion.ts %90`, no-seek, timer mantığına **dokunulmaz**.
- **Backend mi:** Backend (zamanlama/ustalık eşiği server-config; client clock güvenilmez). Read query `['gamification','spaced-feed']`; cevap mutation'ı `MUTATION_KEYS`'e eklenir, idempotent.
- **Tasarım sistemi:** Mevcut `Card`, `ProgressBar`, soru ekranı primitive'leri. Yeni primitive **gerekmez**.
- **Offline:** Read query 24h persist; cevaplar paused-mutation olarak `mutation-defaults.ts`'e kayıt → online'da `resumePausedMutations()`.
- **Başlat:** Leitner ile (şeffaf, regülatöre açıklanabilir, kara-kutu ML değil). FSRS/SM-2'ye yalnız veri birikince geçilir.

**A2. Güven temelli işaretleme (CBM) — yalnız formatif modda**

- **Ne işe yarar:** Quiz/pekiştirme sorusunda "Ne kadar eminsin?" (1-2-3) sorar; yanlış+emin çeyreğini ("Misinformed") tespit eder. Klinikte zarar veren tam bu: emin olduğu yanlış bilgi.
- **Kanıt:** En **klinik açıdan değerli** mekanik (Gardner-Medwin UCL; PMC3650882 tıp öğrencisi kohortlarında daha yüksek ayırt edicilik). UCSD/Amplifire'ın 577 CHM bulgusu.
- **Klinovax bağlantısı:** `lib/exam/` altında saf `cbm-scoring.ts` + testler; pekiştirme quiz ekranında inline Likert. **ZORUNLU sertifikasyon sınavına NEGATİF puanlama KOYULMAZ** (iyi-kalibre temkinli klinisyeni cezalandırır, adalet sorunu). CBM yalnızca **remediation tetiği + analitik sinyal**.
- **Backend mi:** Hafif. Submit payload'a opsiyonel `{questionId, confidence}` eklenir (graceful no-op, alanlar yoksa app kırılmaz — `lib/api/schemas/` deseni). Çeyrek analizi backend.
- **Tasarım sistemi:** `Chip` (1-2-3 seçici, 44pt touch target). Yeni primitive yok.
- **Offline:** Quiz cevabıyla aynı mutation içinde taşınır.

### Katman B — Tutundurma kabuğu (ince, opsiyonel, novelty'ye dirençli)

**B1. Kişisel seri (streak) + freeze**

- **Ne işe yarar:** Ardışık günlerde **pekiştirme seansı** tamamlama serisi (uygulamayı açma değil). Vardiyalı/izinli personel için **freeze sessiz otomatik** uygulanır.
- **Kanıt:** Duolingo'nun en güçlü tutundurma kaldıracı; ama overjustification ve novelty-decay uyarısıyla. Sertifikasyon **asla** streak'e bağlanmaz.
- **Klinovax bağlantısı:** Dashboard hero greeting + streak kartı (`app/(tabs)/dashboard.tsx`); profil header (`app/(tabs)/profile.tsx`). Streak gün sınırı **server-clock** (cihaz saati taklit edilebilir).
- **Backend mi:** Backend (gün rollover, freeze envanteri, UTC reset cron). Client sadece gösterir.
- **Tasarım sistemi:** `Card variant='success'` + `IconSymbol name='flame.fill'` (emoji yasak) + `Text variant='metric'` (tabular-nums). Yeni "streak counter card" primitive opsiyonel.
- **Offline:** Son-cache değer gösterilir (stale-while-revalidate); server senkronla düzeltilir.

**B2. Çift sayaç: "Puan" (statü, azalmaz) ≠ kazanım rozetleri**

- **Ne işe yarar:** Performans/uyumluluk sayısını (puan) harcanabilir/ödülden ayırır → oyunlaştırma gerçek sınav skorunu **bozmaz** (SC Training Scores vs Stars; Docebo points vs coins).
- **Kanıt:** Endüstri yakınsaması; Relias modeli (puan **yüksek sınav skorundan**, tıklamadan değil) overjustification'a direnir.
- **Klinovax bağlantısı:** Profil "Gelişimim" bölümü (`app/(tabs)/profile.tsx` — placeholder'lar gerçek rozet/puan ile değiştirilir). Puan kazanımı sınav geçme/SCORM tamamlama hook'larından (`app/exam/[assignmentId]/result.tsx` `data.isPassed`; `app/scorm/[trainingId].tsx` `finishCompletion()`).
- **Backend mi:** Backend (point_ledger, idempotent). **ASLA client-side puan artırma.**
- **Tasarım sistemi:** `StatCard` (metric), `Tag` (tier), `IconDot` (kilit durumu). Rozet grid'i mevcut `Stack` + `Card`.
- **Offline:** Sınav-geçme zaten online; puan mutation'ı idempotency-key ile paused-resume.

**B3. Kutlama anları (konfeti + haptik) — yalnız NÖTR içerikte**

- **Ne işe yarar:** Sınav geçme/sertifika anında küçük kutlama; pozitif pekiştirme.
- **Kanıt:** Tutundurma/memnuniyet; ama hasta-güvenliği/advers-olay içeriğinde **trivialize riski** (healthysimulation.com).
- **Klinovax bağlantısı:** `app/exam/[assignmentId]/result.tsx` (isPassed). Mevcut `AnimatedSplash.tsx` Ring/Sparkle/Mote desenini fork et → **reanimated-only** partikül (yeni native bağımlılık yok, OTA-able). Confetti/Lottie/Skia **eklenmez** (native build gerektirir, blur/gradient yasağı zaten Skia'dan uzaklaştırır).
- **Backend mi:** Client-only (sonuç verisinden hesaplanır).
- **Tasarım sistemi:** `Hero` + `IconDot` + reanimated worklet; **`useReducedMotion()` ile gate ZORUNLU**. expo-haptics varsa `notificationAsync(Success)` (yoksa eklemek native build).
- **Offline:** İlgisiz (lokal animasyon).

### Katman C — Sosyal (en dikkatli, opsiyonel, varsayılan KAPALI)

**C1. Takım/birim hedefi (bireysel sıralama DEĞİL)**

- **Ne işe yarar:** Birim olarak "bu ay zorunlu modüllerin %X'i zamanında" hedefi; koğuş/birim kültürüne uyar, bireyi utandırmaz.
- **Kanıt:** Axonify takım tablosu "düşük performansı işaret etmeden bağ kurar"; JMIR 2021 makro-tablo dezavantajı; Gies 2026 bireysel "recognition received" tablosu yardımlaşmayı **düşürür**.
- **Klinovax bağlantısı:** Dashboard kartı veya profil "Gelişimim". Mevcut org/multi-org modeli (birim/department) ile gruplanır.
- **Backend mi:** Backend (aggregate, anonim/birim ölçek). **İsimli bireysel sıralama yok.**
- **Tasarım sistemi:** `Card`, `ProgressBar`, `Stack`.
- **Offline:** Read query persist.
- **Önemli:** Server-side admin toggle, **varsayılan OFF**; opt-out tam (rekabet baskısını kaldırır, eğitim çalışmaya devam eder).

## 5. Yapılabilirlik matrisi

Önerilen sıralamaya göre.

| Özellik                                            | Efor | Client / Backend                   | Faz | Kanıt gücü                         |
| -------------------------------------------------- | ---- | ---------------------------------- | --- | ---------------------------------- |
| A1 Aralıklı tekrar pekiştirme (Leitner)            | L    | Backend (+ saf `lib/exam/` modülü) | 1   | **Yüksek** (SMD 0.78 meta-analiz)  |
| A1 push tetik + dashboard "Günün Soruları" kartı   | M    | Client (push zaten var)            | 1   | Yüksek (kadans kanıtı)             |
| B1 Kişisel streak + freeze                         | M    | Backend (server-clock)             | 1   | Orta (Duolingo; novelty uyarılı)   |
| A2 CBM güven seçici (formatif, remediation tetiği) | M    | Backend-hafif (graceful payload)   | 2   | **Yüksek (klinik değer)**          |
| B2 Çift sayaç: puan + rozetler                     | M    | Backend (idempotent ledger)        | 2   | Orta-düşük (PBL salt sürücü değil) |
| B3 Kutlama (reanimated-only + haptik)              | S    | Client-only                        | 2   | Düşük (memnuniyet)                 |
| C1 Takım/birim hedefi (opt-out, varsayılan OFF)    | L    | Backend (aggregate)                | 3   | Orta (sosyal, riskli)              |
| Sezon/zaman-pencereli challenge (novelty tazeleme) | M    | Backend                            | 3   | Orta (decay'e karşı)               |

## 6. Backend ekibine net istekler

**Endpoint'ler** (mevcut `apiFetch<T>` + zod `validate()` deseni; tümü Bearer JWT, idempotent mutation'lar `X-Idempotency-Key` uuid):

- `GET /api/staff/gamification/me` → `{ totalPoints, currentStreak, unlockedBadges, nextBadgeAt }` (profil header, staleTime 5dk).
- `GET /api/staff/gamification/spaced-feed` → günün pekiştirme soruları (zayıf/eski-görülen önce; server sıralar). staleTime kısa, app foreground'da taze.
- `POST /api/staff/gamification/spaced-answer` → `{ questionId, isCorrect, confidence? }`; yanıt `{ nextIntervalBox, retired }`. Idempotent (userId+questionId+date). `MUTATION_KEYS`'e ekle, persist.
- `POST /api/staff/gamification/point-ledger` → `{ eventType: 'exam_passed'|'video_completed'|'feedback_submitted'|'certificate_earned'|'streak_milestone', relatedId }` → `{ earnedPoints, totalPoints, badges? }`. **Whitelist eventType**; per-event guard (exam başına bir kez).
- `GET /api/staff/gamification/badges` → kullanıcı rozetleri + statik tanımlar (`smallIconName` enum: 'star','flame','seal'… — IconSymbol MAPPING ile eşlenir, **URL yok**). staleTime 24h.
- `GET /api/staff/gamification/streaks` → `{ currentDays, lastActionAt(server), nextMilestoneAt, freezeCount }`. Server-clock authoritative.
- `GET /api/staff/gamification/team-goal?scope=department` → birim aggregate (Faz 3, opt-out toggle gated). **İsimli bireysel sıralama döndürmez.**

**Mevcut endpoint genişletmeleri (geriye-uyumlu, opsiyonel alan):**

- `POST /api/exam/[assignmentId]/submit` yanıtına `earnedPoints?`; submit payload'a `confidence?` (CBM).
- `POST /api/feedback/submit` ve video completion yanıtlarına `earnedPoints?` (mobil yoksa graceful atlar).

**Drizzle tabloları:** `point_ledgers` (idempotencyKey unique, totalPoints denorm, eventMetadata jsonb), `user_badges` (userId+ruleId, unlockedAt), `badge_rules` (ruleId, autoUnlock, threshold), `spaced_items` (userId, questionId, box, dueAt, consecutiveCorrect), opsiyonel `leaderboard_snapshots`.

**Cron'lar:** günlük streak reset (UTC midnight, server-clock), streak milestone ödülü (gün 7/14/30 — **client değil cron** yazar), spaced-repetition due hesabı, (Faz 3) takım aggregate cache.

**Güvenlik:** Sıfır client-side skor hesabı; streak gün sınırı server timestamp'tan; badge auto-unlock kural-tabanlı (kendine ödül vermeyi engelle); offline replay için tüm award'lar idempotent.

## 7. YAPILMAMASI gerekenler (anti-patterns)

1. **Kamuya açık bireysel liderlik tablosu — YAPMA.** Neden: Gies 2026 (n=135) "recognition received"/birleşik tablolar yardımlaşmayı **düşürdü** (meslektaş niyetine güven erozyonu); GE stack-ranking'i morali bozduğu için bıraktı; JMIR 2021 makro-tablo alt sıralara kümülatif "başarısızlık hissi" yükler.
2. **Personel sıralamasını KVKK kapsamında ifşa etme — YAPMA.** Neden: Kurul 2020/404 — çalışan "açık rıza"sı güç dengesizliği nedeniyle geçersiz; isimli performans ifşası veri-minimizasyonu/orantılılığı ihlal eder (aggregate/self-view alternatifi varken).
3. **Salt katılımı/devamı ödüllendirme — YAPMA.** Neden: overjustification (Lepper-Greene 1973: beklenen ödül grubu sonradan <yarı oranda; Deci/Koestner/Ryan 1999: beklenen somut ödül d≈−0.40). "Bu modülü bitir, 50 puan kazan" tam bu zararlı profildir. Onun yerine yeterlilik geri bildirimi ("bu modülde ustalaştın").
4. **Emoji / shadow / hardcoded renk-font — YAPMA.** Neden: tasarım sistemi hard rule. ✓✗•⭐🔥 yerine `IconSymbol`/`IconDot`; shadow yerine hairline border; `#hex` yerine `useTheme()` token; `fontSize` yerine `Text variant`.
5. **Hasta-güvenliği/advers-olay içeriğini konfeti/puanla ödüllendirme — YAPMA.** Neden: ciddi klinik içeriği trivialize eder, profesyoneli rahatsız eder (healthysimulation.com). Bu içerik **reward-nötr** kalmalı.
6. **Zorunlu rekabet / hız ödülü / can (hearts) gate — YAPMA.** Neden: SKS zaten eğitimi zorunlu kılar; üstüne rekabet → coerced consent + burnout; hız ödülü "metriği oyna" (öğrenmeden tıkla) davranışını ve no-seek/%90 bütünlük kontrolleriyle çatışmayı davet eder. Vardiyalı/nörodivergent personeli dışlar (timer/streak engelleme).
7. **Statik rozet seti ile novelty tuzağı — YAPMA.** Neden: uzun-ömürlü zorunlu uygulamada etki erir (ES 1.57 → −0.20). Sezon/zaman-pencereli challenge ile içerik tazele; lansman pikinin kalıcı olmasını **bekleme**, kendi completion metriğini ölç.
8. **Sertifikasyonu streak'e/CBM negatif puanına bağlama — YAPMA.** Neden: klinik içeriği trivialize eder, yasal olarak hassas, iyi-kalibre temkinli klinisyeni cezalandırır.

## 8. KVKK / etik / regülasyon notları

- **Hukuki zemin:** Performans/tamamlama verisi kişisel veridir. **Açık rıza işyerinde geçersiz** (Kurul 2020/404, güç dengesizliği). İşleme zemini = hastanenin **SKS yasal yükümlülüğü** (oryantasyon + hizmet-içi eğitim kaydı zorunlu, personel dosyasında tutulur). Oyunlaştırma katmanı bu zemine yaslanır, ayrı standalone aydınlatma ister (bundled consent yasak).
- **Veri minimizasyonu/orantılılık:** İsimli peer sıralaması yerine aggregate/birim ölçek/kişisel-en-iyi varsa, isimli ifşa **orantısızdır**. Varsayılan: kişinin kendi geçmişiyle kıyas + anonim birim yüzdesi.
- **Opt-out gerçek olmalı:** Rekabet/sosyal/streak özellikleri **server-side toggle, varsayılan OFF**; reddetmenin **hiçbir istihdam sonucu olmamalı** (2020/404 gönüllülük kusuru). Opt-out rekabet baskısını tamamen kaldırır, eğitim işlevsel kalır.
- **Otomatik profilleme:** Düşük performansı otomatik "işaretleme" yapma (KVKK/GDPR Art. 22 muadili itiraz hakkı).
- **EU personeli/dağıtımı varsa:** Yüksek-riskli işleme → DPIA + LIA; isimli sıralamayı data-minimisation gerekçelendiremez.
- **Mevcut altyapı uyumu:** `app/kvkk.tsx` aydınlatma + açık rıza ekranı zaten var; oyunlaştırma verisi işleme amacı buraya **ayrı madde** olarak eklenmeli. Ortak cihazda eski kullanıcı verisi sızıntısı `logout` → `queryClient.clear()` ile zaten engelli (`store/auth.ts`).
- **Erişilebilirlik = etik+yasal:** `useReducedMotion` gate her animasyonda; Dynamic Type (maxFontSizeMultiplier 1.6); streak freeze + grace (vardiya/hastalık). Tasarım sistemi kuralları bunu zaten dayatıyor.

## 9. Önerilen yol haritası

**EN YÜKSEK ROI İLK HAMLE:** Aralıklı tekrar pekiştirme modu (A1, Leitner) + günlük push tetik + dashboard "Günün Soruları" kartı. En güçlü kanıt (SMD 0.78), korunan sınav akışına dokunmaz, mevcut push + Query + `lib/exam/` saf-mantık desenine oturur, "oyun" değil "kanıta dayalı bilgi pekiştirme" olarak klinik kültüre uyumlu.

**Faz 1 — MVP (öğrenme çekirdeği + minimal kabuk):**

- A1 aralıklı tekrar (backend: spaced-feed/answer + spaced_items tablo; client: saf `lib/exam/spaced-repetition.ts` + testler, dashboard kartı, push nudge).
- B1 kişisel streak + freeze (backend server-clock; client streak kartı, `flame.fill` IconSymbol).
- Client-only: dashboard/profil yerleşimi, `useReducedMotion` gate'li UI.
- Backend gerekir: spaced endpoint'ler, streak/freeze, point_ledger iskeleti.

**Faz 2 — v2 (klinik değer + kabuk):**

- A2 CBM güven seçici (formatif pekiştirmede; remediation tetiği + heat-map analitik; **zorunlu sınavda negatif puan YOK**).
- B2 çift sayaç (puan + rozetler) — profil "Gelişimim" placeholder'larını gerçek içerikle değiştir.
- B3 kutlama (reanimated-only fork `AnimatedSplash`, haptik) — yalnız nötr içerik.
- Çoğu backend (ledger, badge_rules, CBM analitik); B3 client-only.

**Faz 3 — v3 (sosyal, en dikkatli):**

- C1 takım/birim hedefi (aggregate, **varsayılan OFF**, opt-out, isimli sıralama yok).
- Sezon/zaman-pencereli challenge (novelty-decay'e karşı içerik rotasyonu).
- FSRS/SM-2'ye geçiş (veri biriktiyse, audit log + Leitner fallback ile).
- Tümü backend-ağırlıklı.

## 10. Açık sorular / kullanıcıya sorulacaklar

1. **Soru bankası yeniden kullanımı:** Mevcut sınav soruları pekiştirme modunda (anında geri bildirimli) yeniden kullanılabilir mi, yoksa sınav bütünlüğü için **ayrı pekiştirme soru havuzu** mu gerekiyor?
2. **Sosyal katman istiyor muyuz?** Bireysel sıralama riskleri verildiğinde, takım/birim hedefi bile istenir mi, yoksa Faz 1-2 (sosyal-sız) yeterli mi?
3. **Ödül ekonomisi:** Gerçek/fiziksel ödül (gift card, izin, otopark) düşünülüyor mu? (Türkiye'de vergi/bordro etkisi + KVKK; başlangıçta yalnız tanıma rozetleri öneriyoruz.)
4. **Streak kapsamı:** Streak neye bağlansın — günlük pekiştirme seansı mı, herhangi bir eğitim aktivitesi mi? Freeze sayısı kaç?
5. **CBM negatif puanlama:** Yalnız formatif analitik/remediation tetiği olarak mı (önerimiz), yoksa yönetim puanlamaya dahil etmek istiyor mu?
6. **Yeni native bağımlılık:** Kutlama için **expo-haptics** eklensin mi? (Native build + store submission gerektirir, OTA çözmez.) Konfeti reanimated-only kalsın.
7. **Backend kapasitesi:** hospital-lms ekibi bu endpoint/tablo/cron setini hangi fazda taahhüt edebilir? Mobil Faz 1, backend hazır olmadan ilerleyemez.
8. **Başarı metriği:** Birincil KPI — completion-rate / on-time tamamlama (kanıta-dayalı) mı, yoksa bilgi-tutumu mu?
