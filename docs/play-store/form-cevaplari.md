# Play Console Form Cevapları (Klinovax)

> Bu dosya, Play Console'da doldurman gereken zorunlu formların hazır cevaplarını içerir. Her bölümde hangi soruya ne cevap vereceğin yazılı. Olduğu gibi kopyala-yapıştır / aynı seçeneği işaretle.
>
> Genel ilke: Klinovax kurumsal bir mesleki eğitim uygulamasıdır. **Hasta verisi toplamaz**; sadece personelin hesap ve eğitim/sınav ilerleme verisini işler.

---

## 1. Data Safety (Veri Güvenliği) Formu

> Play Console > "App content" (Uygulama içeriği) > "Data safety".
> Bu form, store sayfasında "Güvenlik bölümü" olarak görünür. Yanlış beyan reddedilme sebebidir; aşağıdakiler gerçek uygulama davranışını yansıtır.

### Bölüm A — Veri toplama ve paylaşım (genel sorular)

| Soru                                                                                      | Cevap                                                                         |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Uygulamanız kullanıcı verisi topluyor veya paylaşıyor mu?                                 | **EVET** (toplar)                                                             |
| Toplanan tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? (encrypted in transit) | **EVET** — tüm trafik HTTPS üzerinden                                         |
| Kullanıcıların verilerinin silinmesini talep etmesi için bir yol sunuyor musunuz?         | **EVET** — kurum yöneticisi üzerinden veya destek e-postası ile (aşağıya bak) |

### Bölüm B — Toplanan veri türleri (Data types)

> Aşağıdaki her veri türü için: "Toplanıyor mu?" = EVET, "Üçüncü tarafla paylaşılıyor mu?" = HAYIR (Sentry açıklaması aşağıda), "Bu veri işlemenin amacı opsiyonel mi yoksa zorunlu mu?" sütunlarını şu şekilde doldur.

#### B.1 — Kişisel bilgiler (Personal info)

| Veri öğesi            | Topla? | Paylaş? | Amaç (purpose)                        | Zorunlu/Opsiyonel | Açıklama                                                   |
| --------------------- | ------ | ------- | ------------------------------------- | ----------------- | ---------------------------------------------------------- |
| **E-posta adresi**    | EVET   | HAYIR   | App functionality, Account management | **Required**      | Kurum hesabıyla giriş için kullanılır                      |
| **İsim (Ad-soyad)**   | EVET   | HAYIR   | App functionality, Account management | **Required**      | Personel profili ve sertifika üzerinde görünür             |
| **Kullanıcı ID'leri** | EVET   | HAYIR   | App functionality, Account management | **Required**      | Personeli atamalara/sınavlara bağlamak için sistem kimliği |

> NOT: Telefon numarası, adres, T.C. kimlik no gibi alanlar mobil uygulamada TOPLANMAZ — işaretleme.

#### B.2 — Uygulama etkinliği (App activity)

| Veri öğesi                                     | Topla? | Paylaş? | Amaç                         | Zorunlu/Opsiyonel | Açıklama                                                   |
| ---------------------------------------------- | ------ | ------- | ---------------------------- | ----------------- | ---------------------------------------------------------- |
| **Uygulama içi etkileşimler / diğer eylemler** | EVET   | HAYIR   | App functionality, Analytics | Required          | Eğitim ilerlemesi, video izleme, sınav cevapları/sonuçları |

> "Eğitim/sınav ilerleme verisi" Play Console'da ayrı bir kategori olarak yoktur; en yakın karşılığı **App activity > "Other actions" / "In-app interactions"** kategorisidir. Buraya işaretle.

#### B.3 — Uygulama bilgileri ve performans (App info and performance)

| Veri öğesi                        | Topla? | Paylaş? | Amaç                         | Zorunlu/Opsiyonel | Açıklama                                                                |
| --------------------------------- | ------ | ------- | ---------------------------- | ----------------- | ----------------------------------------------------------------------- |
| **Crash logs (Çökme günlükleri)** | EVET\* | HAYIR   | Analytics, App functionality | **Optional**      | Sentry ile (PII redakte edilir). \*Aşağıdaki "Sentry durumu" notuna bak |
| **Diagnostics (Tanılama)**        | EVET\* | HAYIR   | Analytics                    | **Optional**      | Performans/hata teşhisi (Sentry)                                        |

#### B.4 — Cihaz veya diğer kimlikler (Device or other IDs)

| Veri öğesi             | Topla? | Paylaş? | Amaç              | Zorunlu/Opsiyonel | Açıklama                                                 |
| ---------------------- | ------ | ------- | ----------------- | ----------------- | -------------------------------------------------------- |
| **Push token (cihaz)** | EVET   | HAYIR   | App functionality | Required          | Hatırlatma bildirimleri göndermek için (Expo push token) |

> Play Console'da push token tam karşılığı yoktur; **"Device or other IDs"** altında beyan et ve amacı "App functionality (bildirim gönderimi)" olarak belirt.

### Sentry durumu notu (ÖNEMLİ)

Sentry crash raporlama **kurulu ama şu an üretimde kapalı** (`EXPO_PUBLIC_SENTRY_DSN` ortam değişkeni set edilmemiş — kod no-op çalışıyor; bkz. `lib/sentry.ts`).

İki seçenek:

- **Yayında Sentry aktif DEĞİLSE**: Crash logs / Diagnostics satırlarını "toplanmıyor" işaretleyebilirsin. Ancak Sentry'yi yakında açacaksan, baştan EVET (Optional) işaretlemen daha güvenli olur (sonradan beyanı genişletmek yerine).
- **Yayında Sentry aktif EDİLECEKSE**: Crash logs + Diagnostics = EVET (Optional) işaretle. Sentry burada **veri işleyici (processor)** olarak çalışır, bağımsız üçüncü taraf paylaşımı sayılmaz → "Paylaş" = HAYIR doğru cevaptır.

**Tavsiye:** Sentry'yi yakında aktive edeceğin için Crash logs + Diagnostics'i **EVET (Optional)** işaretle.

### Veri silme mekanizması (form metni)

"Kullanıcılar verilerinin silinmesini nasıl talep eder?" alanına:

```
Hesaplar kurumlar (hastaneler/klinikler) tarafından oluşturulur ve yönetilir. Personel, verilerinin silinmesini bağlı olduğu kurum yöneticisi aracılığıyla ya da destek@klinovax.com adresine başvurarak talep edebilir. Talep üzerine hesap ve ilişkili eğitim/sınav verileri silinir.
```

---

## 2. Health Apps Declaration (Sağlık Uygulamaları Beyanı)

> Play Console, "Medical" kategorisini seçtiğinde veya sağlıkla ilgili içerik tespit ettiğinde bu beyanı ister.

| Soru / kutucuk                                                           | Cevap                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uygulamanız bir sağlık uygulaması mı?                                    | **EVET**                                                                                                                                                               |
| Alt kategori / uygulama türü                                             | **Sağlık profesyonellerine yönelik eğitim / referans** (Health professional education / reference) — "Hasta yönetimi", "Teşhis", "Tedavi", "Klinik karar destek" DEĞİL |
| Uygulama hasta verisi (PHI / kişisel sağlık verisi) topluyor mu?         | **HAYIR** — yalnızca personel hesap ve eğitim/sınav verisi                                                                                                             |
| Uygulama tıbbi cihaz mı (medical device) ya da teşhis/tedavi sunuyor mu? | **HAYIR**                                                                                                                                                              |
| Klinik araştırma / sağlık verisi araştırması içeriyor mu?                | **HAYIR**                                                                                                                                                              |
| Hedef kitle kim?                                                         | Sağlık kurumu personeli (sağlık profesyonelleri) — genel tüketici / hasta değil                                                                                        |

> Eğer "uygulamanızı tanımlayan ifadeyi seçin" tarzı bir liste çıkarsa: **"Sağlık çalışanlarına eğitim/öğretim sağlar"** benzeri ifadeyi seç. Teşhis, tedavi, ilaç dozu, hasta takibi gibi ifadeleri SEÇME.

---

## 3. Content Rating (İçerik Derecelendirmesi — IARC anketi)

> Play Console > "App content" > "Content rating". IARC anketi. Aşağıdaki cevaplarla beklenen sonuç **PEGI 3 / Everyone (Herkes)**.

| Soru                                                             | Cevap                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Uygulama kategorisi (anket başında sorulur)                      | **Utility, Productivity, Communication, or Other** (Yardımcı program / verimlilik) — oyun değil                            |
| Şiddet içeriyor mu?                                              | HAYIR                                                                                                                      |
| Cinsellik / müstehcenlik içeriyor mu?                            | HAYIR                                                                                                                      |
| Küfür / kaba dil içeriyor mu?                                    | HAYIR                                                                                                                      |
| Korkutucu / rahatsız edici içerik?                               | HAYIR                                                                                                                      |
| Kumar / şans oyunu (gerçek veya simüle)?                         | HAYIR                                                                                                                      |
| Yasa dışı madde / uyuşturucu / alkol / tütün teşviki?            | HAYIR                                                                                                                      |
| Kullanıcılar birbiriyle etkileşime girer mi (sohbet/mesajlaşma)? | HAYIR (kullanıcılar arası iletişim yok; sadece kurum-personel tek yönlü içerik)                                            |
| Kullanıcı tarafından oluşturulan içerik paylaşılır mı?           | HAYIR (geri bildirim formu kuruma gider, kamuya açık paylaşım yok)                                                         |
| Konum paylaşımı var mı?                                          | HAYIR                                                                                                                      |
| Kullanıcının kişisel bilgisi paylaşılıyor / yayınlanıyor mu?     | HAYIR (paylaşım yok; sadece giriş için hesap bilgisi toplanır — bu soruda kasıt "kamuya açık paylaşım"tır, ona göre HAYIR) |
| Dijital satın alma var mı?                                       | HAYIR                                                                                                                      |

**Beklenen sonuç:** PEGI 3 / ESRB Everyone / "Herkes". Anket bitince derecelendirme otomatik atanır.

---

## 4. App Access (Uygulama Erişimi)

> Play Console > "App content" > "App access". Uygulamanın tamamı giriş gerektirdiği için inceleme ekibine test hesabı vermen ZORUNLU.

Seçim:

```
[X] All or some functionality is restricted
    → "All functionality is restricted" (Tüm işlevler kısıtlı — giriş gerekli)
```

Bir erişim talimatı (instruction) ekle. Aşağıdaki şablonu doldur:

| Alan                         | Değer                                         |
| ---------------------------- | --------------------------------------------- |
| Talimat adı (Name)           | Personel test hesabı                          |
| Kullanıcı adı / e-posta      | `<<TEST_HESABI_EPOSTASI — Ekrem dolduracak>>` |
| Şifre                        | `<<TEST_HESABI_SIFRESI — Ekrem dolduracak>>`  |
| Diğer talimatlar (Any other) | Aşağıdaki metni yapıştır                      |

"Any other instructions" alanına:

```
Bu uygulama yalnızca kurum tarafından tanımlanan hesaplarla kullanılır; herkese açık kayıt yoktur. Yukarıdaki e-posta ve şifre ile giriş yapabilirsiniz. Sınav akışını test edebilmeniz için bu hesaba örnek bir eğitim ataması tanımlanmıştır: ana ekrandaki eğitimi açıp ön test, video ve son test adımlarını takip edebilirsiniz. Uygulama açıldığında biyometrik kilit istenirse atlayabilir / cihaz şifresiyle geçebilirsiniz.
```

> HATIRLATMA (Ekrem): Test hesabını backend'de (klinovax.com yönetim panelinde) gerçekten oluştur ve ona en az bir eğitim ata. Aksi halde inceleme ekibi boş ekran görür ve reddedebilir.

---

## 5. Target Audience and Content (Hedef Kitle ve İçerik)

> Play Console > "App content" > "Target audience and content".

| Soru                                                 | Cevap                                             |
| ---------------------------------------------------- | ------------------------------------------------- |
| Hedef yaş aralığı                                    | **18 ve üzeri** (sadece) — çalışan profesyoneller |
| Uygulama çocuklara cazip mi (appeal to children)?    | **HAYIR**                                         |
| Çocuklar için tasarlandı mı? (Designed for Families) | **HAYIR**                                         |

> 18+ seçtiğinde "çocuklar için tasarlanmış" akışı (Families policy) devre dışı kalır — doğru olan budur.

---

## 6. Ads (Reklamlar)

> Play Console > "App content" > "Ads".

| Soru                            | Cevap     |
| ------------------------------- | --------- |
| Uygulamanız reklam içeriyor mu? | **HAYIR** |

---

## 7. Diğer "App content" maddeleri (hızlı geçiş)

| Madde                                | Cevap / not                    |
| ------------------------------------ | ------------------------------ |
| Privacy policy (Gizlilik politikası) | `https://klinovax.com/privacy` |
| News app (Haber uygulaması)?         | HAYIR                          |
| COVID-19 contact tracing/status?     | HAYIR                          |
| Government app?                      | HAYIR                          |
| Financial features?                  | HAYIR                          |
| Data safety                          | Bölüm 1'e göre doldur          |

---

## Özet kontrol listesi (hepsi yeşil olmalı, sonra yayına gönderebilirsin)

- [ ] Data safety formu dolduruldu ve gönderildi
- [ ] Health apps declaration tamamlandı (hasta verisi yok beyanı)
- [ ] Content rating anketi bitti (PEGI 3 / Everyone)
- [ ] App access: test hesabı + talimat girildi (hesap backend'de gerçekten var)
- [ ] Target audience: 18+
- [ ] Ads: Hayır
- [ ] Privacy policy URL girildi
