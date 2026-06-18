# App Store Connect Listing Metinleri (Klinovax — iOS)

> Kopyala-yapıştır hazır. App Store Connect > uygulaman > **"App Information"** + **"<sürüm> Prepare for Submission"** sayfalarına bu metinleri gireceksin.
> Dil: Türkçe (Birincil dil: Turkish). Karakter limitleri her bölümün yanında.
> Kaynak metin Google Play `listing.md` ile aynı (tek doğru kopya); Apple'a özel alanlar + farklı limitler burada işaretli.

---

## App Information (bir kez girilir — sürümden bağımsız)

| Alan                      | Değer                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Name (Uygulama adı)**   | `Klinovax` (limit 30)                                                        |
| **Subtitle (Alt başlık)** | `Kurumsal eğitim ve sertifika` (28/30) — alt başlık arama ve listede görünür |
| **Bundle ID**             | `com.klinovax.app` (EAS ilk build'de App Store Connect'te otomatik bağlanır) |
| **Primary Category**      | **Medical** (Tıp)                                                            |
| **Secondary Category**    | **Education** (Eğitim) — opsiyonel ama uygun                                 |
| **Content Rights**        | "Bu uygulama üçüncü taraf içeriği içermiyor" (kurum içeriği size ait)        |
| **Age Rating**            | Aşağıdaki "Yaş derecelendirme" bölümüne göre anket → beklenen **4+**         |

> Subtitle alternatifleri (hepsi ≤30): `Personel eğitim ve sertifika` (28) · `Sağlıkta eğitim ve sertifika` (28).

---

## Sürüm metinleri ("Prepare for Submission")

### Promotional Text (Tanıtım metni)

> Limit: **170 karakter**. İncelemesiz güncellenebilir (sürüm beklemeden değiştirebilirsin). Açıklamanın üstünde görünür.

```
Kurumunuzun size atadığı zorunlu eğitimleri izleyin, ön test ve son testlere girin, sertifikanıza ulaşın. Yaklaşan son tarihler için bildirim alın.
```

(≈146 karakter.)

### Description (Açıklama)

> Limit: **4000 karakter**. Düz metin. (Apple'da rakip platform adı / fiyat yazma — bu metin temiz.)

```
Klinovax, sağlık kurumlarının personeline atadığı zorunlu mesleki eğitimleri tek bir yerden yönetmenizi sağlayan bir uygulamadır. Hekim, hemşire ve teknisyenler; kurumları tarafından kendilerine tanımlanan eğitimleri takip eder, videoları izler, sınavlara girer ve sertifikalarına ulaşır.

ÖNE ÇIKAN ÖZELLİKLER

- Eğitim atamaları: Kurumunuzun size atadığı eğitimleri tek listede görün. Her eğitimin durumunu (atandı, devam ediyor, geçti, kaldı), son tarihini ve kalan gün sayısını anlık takip edin.

- Kişisel panel: Atanan, devam eden, tamamlanan ve başarısız eğitim sayılarınızı, genel ilerleme yüzdenizi ve yaklaşan eğitimlerinizi ana ekranda görün. Süresi yaklaşan acil eğitimler öne çıkarılır.

- Video eğitimler: Eğitim içeriklerini uygulama içinde izleyin. İzleme ilerlemeniz kaydedilir; eğitim adımları sırayla tamamlanır.

- Ön test ve son test: Eğitimlere bağlı ön sınav ve son sınavlara girin. Süre sayacı, otomatik cevap kaydı ve süre dolduğunda otomatik gönderim ile sınav deneyimi güvenli ve adildir.

- Sertifikalar: Başarıyla tamamladığınız eğitimlerin sertifikalarını görüntüleyin, PDF olarak önizleyin ve paylaşın. Her sertifikanın verilme tarihi, geçerlilik süresi ve doğrulama kodu görünür.

- Hatırlatma bildirimleri: Yaklaşan son tarihler, yeni atamalar ve sonuçlar için anlık bildirim alın.

- Geri bildirim: Tamamladığınız eğitimler için kurumunuza geri bildirim verin.

- Biyometrik kilit: Yüz tanıma veya parmak izi ile uygulamanızı güvende tutun.

- Açık ve koyu tema: Cihaz ayarınıza göre otomatik uyum.

KİMLER KULLANIR

Klinovax yalnızca kurumsal kullanım içindir. Uygulamayı kullanabilmeniz için kurumunuzun (hastane, klinik vb.) size bir hesap tanımlamış olması gerekir. Bireysel kayıt yoktur.

ÖNEMLİ UYARILAR

Bu uygulama yalnızca kurum personelinin mesleki eğitimi içindir. Tıbbi cihaz değildir ve tıbbi tavsiye sunmaz. Kullanım için kurumunuz tarafından tanımlanmış bir hesap gereklidir.

Gizlilik Politikası: https://klinovax.com/privacy
KVKK Aydınlatma Metni: https://klinovax.com/kvkk
Kullanım Koşulları: https://klinovax.com/terms
```

### Keywords (Anahtar kelimeler)

> Limit: **100 karakter toplam**, virgülle ayrılmış, boşluk kullanma (boşluk karakter yer). Uygulama adı ("Klinovax") ve kategori adını tekrar etme — onlar zaten indekslenir.

```
eğitim,sağlık,sertifika,hastane,personel,sınav,hemşire,hekim,kurs,mesleki,klinik,video,test
```

(≈92 karakter.)

### URL'ler

| Alan                             | Değer                                            |
| -------------------------------- | ------------------------------------------------ |
| **Support URL** (zorunlu)        | `https://klinovax.com` (veya `.../destek` varsa) |
| **Marketing URL** (opsiyonel)    | `https://klinovax.com`                           |
| **Privacy Policy URL** (zorunlu) | `https://klinovax.com/privacy`                   |

> ⚠️ Bu üç URL submit anında **canlı ve erişilebilir** olmalı. Özellikle `privacy` sayfası 200 dönmeli, yoksa Apple "Guideline 5.1.1" ile reddeder.

---

## App Privacy ("Nutrition Labels") — App Store Connect > "App Privacy"

> Bu, Apple'ın store sayfasında "App Privacy" kartı olarak görünen beyandır. Google Play "Data Safety" ile aynı gerçek davranışı yansıtır (kaynak: `play-store/form-cevaplari.md`). Yanlış beyan = ret sebebi.
>
> Her veri türü için Apple üç şey sorar:
>
> 1. **Bu veriyi topluyor musun?** → aşağıdaki tabloya göre EVET
> 2. **Kullanıcının kimliğine bağlı mı? (Linked to identity)** → **EVET** (hepsi hesap tabanlı)
> 3. **Kullanıcıyı takip için mi kullanılıyor? (Used for tracking)** → **HAYIR** (hiçbir veride çapraz-uygulama/reklam takibi yok)

| Apple veri kategorisi | Topla? | Data type seçimi                | Amaç (Purpose)               | Linked? | Tracking? |
| --------------------- | ------ | ------------------------------- | ---------------------------- | ------- | --------- |
| **Contact Info**      | EVET   | Email Address, Name             | App Functionality            | EVET    | HAYIR     |
| **Identifiers**       | EVET   | User ID, Device ID (push token) | App Functionality            | EVET    | HAYIR     |
| **Usage Data**        | EVET   | Product Interaction             | App Functionality, Analytics | EVET    | HAYIR     |
| **Diagnostics**\*     | EVET\* | Crash Data, Performance Data    | Analytics, App Functionality | EVET    | HAYIR     |

- **User ID / Email / Name:** kurum hesabıyla giriş + sertifika/profil için (Required).
- **Device ID (push token):** hatırlatma bildirimleri için (Expo push token). Apple'da en yakın karşılık "Device ID".
- **Product Interaction:** eğitim ilerlemesi, video izleme, sınav cevapları/sonuçları.
- **\* Diagnostics (Sentry):** Sentry **kurulu ama üretimde şu an KAPALI** (`EXPO_PUBLIC_SENTRY_DSN` set değil → `lib/sentry.ts` no-op). Yakında aktive edeceğin için **şimdiden EVET (Crash + Performance Data)** işaretlemen daha güvenli — sonradan beyanı genişletmek yerine baştan kapsa. Sentry burada veri işleyici (processor); bağımsız üçüncü-taraf paylaşımı sayılmaz → "Tracking = HAYIR" doğru. Yayında Sentry'yi hiç açmayacaksan bu satırı "toplanmıyor" yapabilirsin.
- **TOPLANMAZ (işaretleme):** Konum, Kişiler, Fotoğraflar (galeriye sertifika kaydı kullanıcı eylemiyle olur, uygulama foto toplamaz), Finansal bilgi, Sağlık/Fitness (hasta verisi YOK), Hassas bilgi, Arama geçmişi, Reklam verisi.

---

## Yaş derecelendirme (Age Rating anketi)

> App Store Connect > App Information > "Age Rating" > "Edit". Aşağıdaki cevaplarla beklenen sonuç **4+**.

| Soru                                            | Cevap                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Cartoon/Fantasy Violence, Realistic Violence    | None                                                                        |
| Sexual Content / Nudity, Profanity, Crude Humor | None                                                                        |
| Alcohol, Tobacco, Drug Use references           | None                                                                        |
| Mature/Suggestive Themes, Horror/Fear           | None                                                                        |
| Gambling (simulated or real)                    | None / No                                                                   |
| **Medical/Treatment Information**               | **None** — uygulama mesleki EĞİTİM verir; teşhis/tedavi/ilaç bilgisi sunmaz |
| Unrestricted Web Access                         | No                                                                          |
| User Generated Content                          | No (geri bildirim kuruma gider, kamuya açık paylaşım yok)                   |

> Not: "Age Rating" (Apple) ≠ hedef kitle. İçerik 4+ çıksa da uygulama kurumsal/18+ profesyoneller içindir; bu çelişki değildir.

---

## App Review Information (İnceleme ekibi için — ZORUNLU)

> Uygulamanın tamamı giriş arkasında. App Store Review ekibi giremezse **Guideline 2.1** ile reddeder. App Store Connect > sürüm > "App Review Information".

| Alan                                        | Değer                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| **Sign-in required**                        | ✅ İşaretle (evet, giriş gerekli)                              |
| **Username**                                | `<<TEST_HESABI — Ekrem doğrudan ASC'ye girer, repoya YAZMA>>`  |
| **Password**                                | `<<TEST_SIFRESI — Ekrem doğrudan ASC'ye girer, repoya YAZMA>>` |
| **Contact First/Last Name + Phone + Email** | Kendi iletişim bilgilerin (Apple sana ulaşmak için)            |

**Notes (İnceleme notları)** alanına şunu yapıştır:

```
Klinovax kurumsal bir mesleki eğitim uygulamasıdır; yalnızca sağlık kurumları tarafından tanımlanan personel hesaplarıyla kullanılır, herkese açık kayıt yoktur. Yukarıdaki kullanıcı adı ve şifre ile giriş yapabilirsiniz.

Sınav akışını test edebilmeniz için bu hesaba örnek bir eğitim ataması tanımlanmıştır: ana ekrandaki eğitimi açın ve ön test → video → son test adımlarını sırayla takip edin.

Uygulama açıldığında biyometrik kilit (Face ID) istenebilir; "İptal" / cihaz şifresi ile geçebilir veya atlayabilirsiniz. Uygulama hasta verisi işlemez; yalnızca personel hesap ve eğitim/sınav ilerleme verisi tutulur.
```

> ⚠️ Şifreyi bu dosyaya (repoya) YAZMA — git geçmişine düşer. Doğrudan App Store Connect formuna gir. Hesabın backend'de (klinovax.com) gerçekten var ve **en az bir eğitim atanmış** olmalı, yoksa boş ekran → ret.

---

## Export Compliance (İhracat uyumu)

`app.json` → `ios.config.usesNonExemptEncryption: false` ayarlı. Bu sayede Apple her sürümde "encryption" sorusunu **otomatik geçer**; ek belge gerekmez. (Uygulama yalnız standart HTTPS kullanır — muafiyet kapsamında.)

---

## Ekran görüntüleri (Screenshots) — ayrı görsel dosyalar

> Metin değil; App Store Connect yükleme bekler. Simulator/cihaz build'inden çek (Cmd+S simulator'da).

| Cihaz sınıfı                    | Çözünürlük (px)          | Zorunlu mu?                                             |
| ------------------------------- | ------------------------ | ------------------------------------------------------- |
| **6.9" iPhone** (15/16 Pro Max) | 1290×2796 veya 1320×2868 | ✅ **ZORUNLU** — en az 1 (3-5 öneri)                    |
| 6.5" iPhone                     | 1242×2688 / 1284×2778    | Opsiyonel (6.9 verince Apple ölçekler)                  |
| **13" iPad** (12.9")            | 2048×2732                | ⚠️ `supportsTablet: true` ise **ZORUNLU** — aşağıya bak |

> **KARAR — iPad desteği:** `app.json`'da `ios.supportsTablet: true`. Bu durumda Apple **13" iPad ekran görüntüsü ŞART koşar.** İki seçenek:
>
> 1. iPad ekran görüntülerini de çek (iPad simulator'da uygulamayı çalıştır → 4-5 ekran).
> 2. iPad'i hedeflemiyorsan `app.json` → `supportsTablet: false` yap (üretim build'inden ÖNCE) → iPad screenshot zorunluluğu kalkar. Telefon-öncelikli bir hastane uygulaması için makul. (Bu native config; zaten ilk üretim build'ini henüz almadık, ek maliyet yok.)
>
> İçerik önerisi (her iki tema da güzel durur): Dashboard, Eğitim listesi, Sınav (timer görünür), Sertifika, SMG/360° ekranlarından çek.

> **App Store marketing icon:** Uygulama ikonu (1024×1024, **alfa/şeffaflık YOK**) build içindeki ikondan otomatik gelir; ayrı yüklemeye gerek yok (Xcode/EAS asset'ten üretir). Google Play'deki gibi ayrı "feature graphic" Apple'da YOKTUR.
