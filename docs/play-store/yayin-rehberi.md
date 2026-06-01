# Klinovax — Google Play Store Yayın Rehberi (Sıfırdan, Adım Adım)

> Bu rehber, Google Play Developer hesabını yeni açan biri için yazıldı. Her adımda hangi menüye gidip hangi butona basacağın yazılı. Acele etme; sırayla git.
>
> **Hedef:** Klinovax'ı (com.klinovax.app) Google Play'de önce **kapalı test (closed testing)** track'ine koymak. Yeni kişisel geliştirici hesaplarında Google, üretime (production) çıkmadan önce **en az 12 test kullanıcısı + 14 gün kesintisiz kapalı test** şartı arar.
>
> Notasyon: Her adımın başında **[Süre]** ve **[Kim]** (Ekrem mi, Claude mu) belirtilir.

---

## Genel akış (kuş bakışı)

```
1. Hesap aç ($25)              7. Kapalı test + AAB yükle + tester ekle
2. 12+ tester listesi          8. 14 gün bekle (her gün test ettir)
3. Uygulama oluştur            9. Production access başvurusu
4. Service account JSON       10. Yayın sonrası: otomatik submit
5. Store listing doldur
6. Formları doldur
```

---

## Adım 1 — Google Play Developer hesabı açma

**[Süre: ~30 dk + kimlik doğrulama beklemesi 1-2 gün] [Kim: Ekrem]**

1. Tarayıcıdan `https://play.google.com/console` adresine git.
2. Kişisel Google hesabınla giriş yap.
3. Hesap türü olarak **"Kendim / Bireysel (Personal)"** seç (kişisel hesap açacağın için).
4. **25 USD** tek seferlik kayıt ücretini öde (kredi kartı).
5. Google, kimlik doğrulaması ister: kimlik belgesi (pasaport/ehliyet) yükle ve adres bilgisi gir. Onay 1-2 gün sürebilir.
6. Onay gelene kadar bekle — onay gelmeden uygulama yayınlayamazsın.

> Yeni hesaplarda Google, "kişisel hesaplar için kapalı test zorunluluğu" uygular: üretime çıkmadan önce kapalı testi tamamlaman gerekir (Adım 7-9).

---

## Adım 2 — En az 12 test kullanıcısı (tester) listesi hazırlama

**[Süre: ~20 dk + insanlardan onay] [Kim: Ekrem]**

Neden gerekli: Google, yeni kişisel hesapların üretime geçebilmesi için **en az 12 testçinin, kesintisiz 14 gün boyunca** kapalı teste katılmasını şart koşuyor. Sayı 12'nin altına düşerse veya katılım kesilirse sayaç sıfırlanabilir.

Kurallar:

- 12+ kişinin **Gmail (Google) adreslerini** topla. Test kullanıcıları Google hesabı olan gerçek kişiler olmalı.
- Bu kişiler testten **çıkmamalı (opt-in kalmalı)** — yani teste katıldıktan sonra 14 gün boyunca testçi listesinde kalmalılar. Katılımı bırakırlarsa süre etkilenir.
- İdeali: 12 yerine 14-15 kişi topla ki biri ayrılırsa sayı altına düşmesin.
- Testçilere ne yapacaklarını anlat: "Size bir Play Store test linki göndereceğim, oradan uygulamayı kurun, ara sıra açın, silmeyin."

Hazırla:

```
Tester e-posta listesi (en az 12):
1. ____________@gmail.com
2. ____________@gmail.com
... (14-15'e kadar doldur)
```

> Bu listeyi Adım 7'de Play Console'a gireceksin.

---

## Adım 3 — Play Console'da uygulama oluşturma

**[Süre: ~10 dk] [Kim: Ekrem]**

1. Play Console ana sayfasında sağ üstteki **"Uygulama oluştur (Create app)"** butonuna bas.
2. Formu doldur:

| Alan                              | Değer                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| Uygulama adı (App name)           | `Klinovax`                                                           |
| Varsayılan dil (Default language) | `Türkçe (tr-TR)`                                                     |
| Uygulama mı oyun mu?              | **Uygulama (App)**                                                   |
| Ücretsiz mi ücretli mi?           | **Ücretsiz (Free)**                                                  |
| Beyanlar (Declarations)           | "Developer Program Policies" ve "US export laws" kutularını işaretle |

3. **"Uygulama oluştur"** ile bitir. Artık sol menüde uygulama panelin açılır.

> ÖNEMLİ: Paket adı (package name) burada SEÇİLMEZ; ilk AAB'yi yüklediğinde otomatik `com.klinovax.app` olarak kilitlenir. Bu yüzden Adım 7'de yüklenecek AAB'nin paketi `com.klinovax.app` olmalı (zaten `app.json`'da öyle).

---

## Adım 4 — Google Cloud service account JSON oluşturma (otomatik submit için)

**[Süre: ~25 dk] [Kim: Ekrem (Claude rehberlik eder)]**

Bu adım, ileride `eas submit` ile otomatik yükleme yapabilmek için gerekli. İlk AAB'yi elle yükleyeceğiz (Adım 7), ama sonraki sürümler için bu anahtarı şimdi hazırlamak iyi.

### 4a. Google Cloud'da service account oluştur

1. `https://console.cloud.google.com` adresine, Play Console ile **aynı Google hesabıyla** gir.
2. Üstteki proje seçiciden **"Yeni Proje (New Project)"** oluştur. Ad: `klinovax-play`. Oluştur ve bu projeyi seç.
3. Sol menü > **"IAM & Admin" > "Service Accounts (Hizmet hesapları)"**.
4. Üstte **"+ CREATE SERVICE ACCOUNT (Hizmet hesabı oluştur)"** bas.
   - Ad: `klinovax-play-publisher`
   - "Create and continue" → rol atamayı şimdilik atlayabilirsin (rolü Play Console tarafında vereceğiz) → "Done".
5. Oluşan hesabın satırına tıkla > üst sekmelerden **"KEYS (Anahtarlar)"** > **"ADD KEY" > "Create new key"** > tür **JSON** > "Create".
6. Tarayıcı bir JSON dosyası indirir. Bu dosyayı **`google-play-service-account.json`** olarak yeniden adlandır.

### 4b. Dosyayı repoya koy (ASLA commit'leme)

```bash
# İnen JSON'u repo köküne taşı (kendi indirme yolunu yaz):
mv ~/Downloads/klinovax-play-xxxxxx.json /Users/ekremyilmaz/code/klinovax-mobile/google-play-service-account.json
```

> Bu dosya zaten `.gitignore`'da (`google-play-service-account.json`). Yine de `git status` ile dosyanın görünmediğinden emin ol. İçinde özel anahtar var — kimseyle paylaşma, commit'leme.

### 4c. Play Console'da bu hesabı yetkilendir

1. Play Console > sol altta **"Setup (Kurulum)" > "API access"** (veya hesap düzeyinde "Users and permissions").
2. Az önce oluşturduğun Google Cloud projesini bağla (Play Console "Link" / "Choose a project" der).
3. Service account'u davet et / yetkilendir ve rol ver: **"Release manager"** (yayın yöneticisi) yeterli; gerekirse uygulama bazında "Admin" verebilirsin. JSON'daki `client_email` adresini görmen lazım.
4. Kaydet. Birkaç dakika içinde yetki aktif olur.

> Bu adım olmadan `eas submit --platform android` "yetkisiz" hatası verir. İlk sürümü zaten elle yükleyeceğin için acil değil, ama sonraki sürümler için şart.

---

## Adım 5 — Store listing (mağaza girişi) doldurma

**[Süre: ~20 dk] [Kim: Ekrem]**

1. Sol menü > **"Grow (Büyüt)" / "Store presence" > "Main store listing (Ana store girişi)"**.
2. `docs/play-store/listing.md` dosyasını aç ve alanları kopyala:
   - Uygulama adı → `Klinovax`
   - Kısa açıklama (80 karakter) → listing.md'deki blok
   - Tam açıklama (4000 karakter) → listing.md'deki uzun açıklama bloğu
3. Grafik varlıkları yükle (ikon 512x512, feature 1024x500, en az 2 ekran görüntüsü). listing.md'deki tabloya bak. Görselleri henüz hazırlamadıysan bu kısmı sona bırak ama yayından önce şart.
4. İletişim bilgileri ve gizlilik politikası URL'sini gir (`https://klinovax.com/privacy`).
5. Kaydet.

---

## Adım 6 — Zorunlu formları doldurma

**[Süre: ~30 dk] [Kim: Ekrem]**

1. Sol menü > **"Policy and programmes" / "App content (Uygulama içeriği)"**.
2. `docs/play-store/form-cevaplari.md` dosyasını yanına aç ve sırayla doldur:
   - **Data safety** (Bölüm 1) — en uzun form, dikkatli doldur
   - **Health apps declaration** (Bölüm 2)
   - **Content rating** (Bölüm 3) — anket; PEGI 3 / Everyone çıkmalı
   - **App access** (Bölüm 4) — test hesabı bilgilerini gir (önce backend'de hesabı oluştur!)
   - **Target audience and content** (Bölüm 5) — 18+
   - **Ads** (Bölüm 6) — Hayır
   - Privacy policy URL (Bölüm 7)
3. Her formu "Save" + gerekiyorsa "Submit" ile tamamla. App content sayfasında her madde yeşil tik olmalı.

---

## Adım 7 — Kapalı test track'i oluşturma + ilk AAB yükleme + tester ekleme

**[Süre: ~40 dk (AAB build süresi hariç)] [Kim: Ekrem; build komutu Claude/Ekrem]**

### 7a. Üretim AAB'sini oluştur (EAS)

İlk Android üretim derlemesini al:

```bash
cd /Users/ekremyilmaz/code/klinovax-mobile
npm run eas:prod
# veya yalnızca android: eas build --profile production --platform android
```

> Bu komut EAS sunucusunda bir `.aab` (app bundle) üretir; bitince indirme linki verir. `eas.json`'da production profili `buildType: "app-bundle"` olarak ayarlı (Play Store AAB ister). İlk imzalamada EAS, uygulama imza anahtarını yönetmeyi teklif eder — kabul et (Play App Signing ile uyumlu).

### 7b. Kapalı test track'i aç

1. Play Console > sol menü > **"Test and release" / "Testing" > "Closed testing (Kapalı test)"**.
2. Varsayılan bir "Closed testing" track'i (genelde "Alpha") vardır; **"Create track"** ile yeni de açabilirsin. Birini seç > **"Create new release (Yeni sürüm oluştur)"**.
3. İndirdiğin `.aab` dosyasını **"App bundles"** alanına sürükle-bırak / yükle. (İlk yüklemede Play App Signing onayı çıkarsa kabul et.)
4. Sürüm notları (Release notes) alanına kısa bir şey yaz, örn: `İlk kapalı test sürümü.`
5. **"Next" → "Save" → "Review release" → "Start rollout to Closed testing"**.

### 7c. Testçileri ekle

1. Aynı "Closed testing" track sayfasında **"Testers (Testçiler)"** sekmesine git.
2. **"Create email list"** ile bir e-posta listesi oluştur ve Adım 2'deki 12+ Gmail adresini yapıştır.
3. Listeyi track'e ekle ve kaydet.
4. Sayfadaki **"Copy link" / katılım (opt-in) URL'sini** kopyala. Bu linki testçilere gönder.
5. Testçilerden: linke girip "Become a tester" / "Katıl" demelerini, sonra Play Store'dan Klinovax'ı kurmalarını iste.

> 14 günlük sayaç, kapalı test yayını başlayıp testçiler katılmaya başladığında işler. En az 12 testçinin opt-in kalması gerekir.

---

## Adım 8 — 14 gün bekleme süresinde yapılacaklar

**[Süre: 14 gün] [Kim: Ekrem (testçileri yönlendirir)]**

- 12+ testçinin teste **katıldığından (opt-in)** emin ol. Katılmayan olursa hatırlat.
- Testçilerin uygulamayı silmemesini, ara sıra açmasını iste.
- Bu sürede bug bulursan: düzelt → yeni AAB build et (`npm run eas:prod`) → aynı kapalı test track'ine yeni sürüm yükle. Bu sayacı sıfırlamaz (testçiler aynı kaldığı sürece).
- Test hesabının (App access'te verdiğin) backend'de çalıştığını ve örnek eğitim atamasının durduğunu doğrula.

---

## Adım 9 — Production access (üretim erişimi) başvurusu

**[Süre: ~20 dk başvuru + Google incelemesi birkaç gün] [Kim: Ekrem]**

14 gün + 12 testçi şartı dolunca:

1. Play Console > **"Test and release" > "Production"** veya açılan **"Apply for production access"** akışını başlat.
2. Google birkaç soru sorar. Hazır cevap taslakları:

**"Uygulamanızı nasıl test ettiniz?"**

```
Uygulamayı 14 gün boyunca 12+ kapalı test kullanıcısıyla test ettik. Test kullanıcıları gerçek cihazlarda giriş yaptı, kendilerine atanan eğitimleri izledi, ön test ve son testlere girdi, sertifika görüntüleme ve bildirim akışlarını denedi. Tespit edilen sorunlar giderilip yeni sürümler kapalı teste sunuldu.
```

**"Uygulamanız ne işe yarıyor / hedef kitlesi kim?"**

```
Klinovax, sağlık kurumlarının (hastane/klinik) personeline atadığı zorunlu mesleki eğitimleri yönettiği kurumsal bir uygulamadır. Hedef kitle, kurum tarafından hesabı tanımlanan sağlık çalışanlarıdır (hekim, hemşire, teknisyen). Hasta verisi işlenmez; yalnızca personelin hesap ve eğitim/sınav ilerleme verisi tutulur. Bireysel/halka açık kayıt yoktur.
```

**"Test sürecinde ne öğrendiniz?"**

```
Giriş, eğitim izleme, sınav süre yönetimi ve bildirim akışlarının farklı cihazlarda sorunsuz çalıştığını doğruladık. Açık/koyu tema ve biyometrik kilit gibi özellikleri çeşitli cihazlarda test ettik.
```

3. Başvuruyu gönder. Google inceler; onaylanınca Production track'ine sürüm gönderebilirsin.

---

## Adım 10 — Yayın sonrası (sonraki sürümler otomatik)

**[Süre: her sürümde ~5 dk + build] [Kim: Ekrem]**

Production access onaylandıktan ve service account (Adım 4) bağlandıktan sonra, yeni sürümler için:

1. `app.json` > `expo.version`'ı bump et (örn. `1.0.0` → `1.0.1`).
2. Üretim build'i al ve gönder:

```bash
npm run eas:prod
# build bitince:
npm run eas:submit:android
# (veya: eas submit --profile production --platform android)
```

3. `eas.json`'da Android submit `track: "internal"` ayarlı; ilk gönderim internal/test track'ine düşer, oradan Play Console'da **"Promote release"** ile production'a yükseltirsin. İstersen `eas.json`'da track'i doğrudan `production` yapabilirsin.

> NATIVE değişiklik (yeni paket/plugin/native config) yaptıysan OTA yetmez — mutlaka yeni AAB build + submit. Sadece JS değiştiyse `expo update` ile OTA yeterli olabilir (store submission gerekmez).

---

## Sık karşılaşılan sorunlar

- **"Paket adı zaten kullanılıyor"**: `com.klinovax.app` başka bir uygulamaya kilitlenmiş demektir; yeni hesapta sorun olmaz.
- **App access reddi**: Test hesabı çalışmıyorsa veya örnek atama yoksa inceleme boş ekran görür → reddeder. Backend'de hesabı ve atamayı önceden hazırla.
- **Data safety reddi**: Beyan ile gerçek davranış uyuşmazsa reddedilir. `form-cevaplari.md`'deki tablolar gerçek koda göre hazırlandı; ekstra veri eklemediysen değiştirme.
- **`eas submit` yetki hatası**: Adım 4c'deki service account yetkisi eksik veya henüz aktif değil. Birkaç dakika bekle, rolü "Release manager" yap.
