# Klinovax — Apple App Store Yayın Rehberi (Sıfırdan, Adım Adım)

> Apple Developer hesabını yeni açan biri için yazıldı. Her adımda hangi menüye gidip ne yapacağın yazılı. Sırayla git.
>
> **Hedef:** Klinovax'ı (`com.klinovax.app`) önce **TestFlight** (iç test) ile dene, sonra **App Store**'a (üretim) gönder.
>
> Notasyon: her adımın başında **[Süre]** ve **[Kim]** (Ekrem mi, Claude mu).
>
> **Mevcut hazırlık durumu (bu repo):** ✅ Kod + config App Store'a hazır (`app.json`: version 1.0.0, bundle `com.klinovax.app`, izin metinleri, `usesNonExemptEncryption: false`). ✅ Listing metinleri + privacy beyanı → `docs/app-store/listing-ios.md`. ⛔ Tek eksik: Apple Developer hesabı (Adım 1) ve hesaptan gelen 3 değer (Adım 4).

---

## Genel akış (kuş bakışı)

```
1. Apple Developer Program'a kayıt ($99/yıl)   5. eas.json'daki 3 placeholder'ı doldur
2. App Store Connect'te uygulama oluştur       6. Üretim build al (eas build, iOS)
3. Listing + App Privacy + yaş + review notu   7. TestFlight'a gönder + iç test
4. Apple ID / Team ID / ASC App ID'yi al        8. App Store'a submit + inceleme (~1-2 gün)
```

> **Android'den temel fark:** Apple'da yeni hesap için "12 testçi × 14 gün" zorunluluğu **YOK**. TestFlight iç test isteğe bağlı; istersen build alır almaz doğrudan App Store incelemesine gönderebilirsin. İnceleme tipik 24-48 saat.

---

## Adım 1 — Apple Developer Program'a kayıt

**[Süre: ~30 dk + onay 1-2 gün] [Kim: Ekrem]**

1. `https://developer.apple.com/programs/enroll/` adresine Apple ID'nle gir (yoksa oluştur — kişisel Apple ID olur).
2. Apple ID'de **iki faktörlü doğrulama (2FA) açık olmalı** (zorunlu).
3. Hesap türü:
   - **Individual (Bireysel):** en hızlı; mağazada geliştirici adı kendi adın olarak görünür.
   - **Organization (Kurumsal):** "Klinovax" şirket adıyla görünür; D-U-N-S numarası ister, daha uzun sürer. Kurumsal görünmek istiyorsan bunu seç (ama D-U-N-S başvurusu günler alabilir).
4. **99 USD/yıl** öde (kredi kartı). Apple kimlik doğrulaması yapar; onay genelde birkaç saat–2 gün.
5. Onay e-postası gelene kadar bekle. Onaysız build imzalanamaz.

> Öneri: hız önemliyse **Individual** ile başla; sonra istersen kuruma taşıma yapılabilir.

---

## Adım 2 — App Store Connect'te uygulama oluştur

**[Süre: ~10 dk] [Kim: Ekrem]**

1. `https://appstoreconnect.apple.com` > **"My Apps"** > sol üst **"+" > "New App"**.
2. Formu doldur:

| Alan             | Değer                                                               |
| ---------------- | ------------------------------------------------------------------- |
| Platforms        | **iOS**                                                             |
| Name             | `Klinovax`                                                          |
| Primary Language | **Turkish (tr)**                                                    |
| Bundle ID        | `com.klinovax.app` — listede yoksa açıklamaya bak ↓                 |
| SKU              | `klinovax-ios` (serbest, iç referans; herhangi bir benzersiz metin) |
| User Access      | Full Access                                                         |

3. **"Create"**.

> **Bundle ID listede yoksa:** İlk EAS build'i (Adım 6) çalıştırdığında EAS, Apple hesabında `com.klinovax.app` için bir App ID (identifier) otomatik oluşturur. Sıralama takılırsa: önce Adım 6'daki build'i bir kez başlat (EAS Apple'a login olup identifier'ı yaratır), sonra buraya dönüp uygulamayı oluştur. Alternatif: `developer.apple.com/account` > Identifiers > "+" ile elle `com.klinovax.app` ekle.

---

## Adım 3 — Listing + App Privacy + yaş + inceleme notunu doldur

**[Süre: ~30 dk] [Kim: Ekrem (metinler hazır)]**

`docs/app-store/listing-ios.md` dosyasını yanına aç ve App Store Connect'te şu sayfaları doldur:

1. **App Information:** Subtitle, kategoriler (Medical + Education), Age Rating anketi (→ 4+).
2. **Pricing and Availability:** Free; ülke seçimi (Türkiye + istersen tümü).
3. **App Privacy:** `listing-ios.md` > "App Privacy" tablosundaki veri türlerini gir (Contact Info, Identifiers, Usage Data, Diagnostics). Her biri Linked=Evet, Tracking=Hayır.
4. **Prepare for Submission** (sürüm sayfası): Promotional Text, Description, Keywords, Support URL, Marketing URL, Privacy Policy URL, ekran görüntüleri.
5. **App Review Information:** test hesabı kullanıcı adı/şifre (⚠️ doğrudan forma, repoya değil) + inceleme notu metni.

> Ekran görüntüleri Adım 7'de (build çalışınca) çekilebilir; metinleri şimdi girip görselleri sona bırakabilirsin. **Karar:** `supportsTablet` → `listing-ios.md`'deki iPad notuna bak (iPad screenshot zorunluluğu).

---

## Adım 4 — Gerekli 3 değeri al (eas.json için)

**[Süre: ~5 dk] [Kim: Ekrem → Claude'a verir]**

`eas.json` > `submit.production.ios`'ta üç placeholder var. Şu üç değeri bul:

| Placeholder                    | Nereden                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `<<KULLANICI_APPLE_ID>>`       | Apple Developer'a kayıtlı **e-posta adresin**                                                                           |
| `<<APPLE_TEAM_ID>>`            | `developer.apple.com/account` > **Membership details** > "Team ID" (10 haneli, örn. `A1B2C3D4E5`)                       |
| `<<APP_STORE_CONNECT_APP_ID>>` | App Store Connect > uygulaman > **App Information** > "General Information" > **Apple ID** (sayısal, örn. `6450000000`) |

> Bu üçünü bana verince `eas.json`'u doldururum (veya `eas submit` interaktif modda kendisi sorar — ama dosyaya yazmak otomasyon için daha temiz).

---

## Adım 5 — eas.json placeholder'larını doldur

**[Süre: ~2 dk] [Kim: Claude]**

Adım 4'teki üç değerle `eas.json` > `submit.production.ios` güncellenir:

```jsonc
"ios": {
  "appleId": "ekrem@...",          // <<KULLANICI_APPLE_ID>>
  "ascAppId": "6450000000",        // <<APP_STORE_CONNECT_APP_ID>>
  "appleTeamId": "A1B2C3D4E5"      // <<APPLE_TEAM_ID>>
}
```

> İlk `eas submit`'te EAS, Apple ID 2FA için bir **App-Specific Password** ister: `appleid.apple.com` > "Sign-In and Security" > "App-Specific Passwords" > "+" ile üret. İstersen EAS env'e koy: `EXPO_APPLE_APP_SPECIFIC_PASSWORD`.

---

## Adım 6 — Üretim build'i al (App Store binary)

**[Süre: ~20-40 dk build (EAS sunucusunda)] [Kim: Claude komutu çalıştırır; Apple login Ekrem]**

```bash
eas build --profile production --platform ios
```

- İlk çalıştırmada EAS **Apple hesabına login** olmanı ister (interaktif: Apple ID + 2FA kodu). Bunu Ekrem girer.
- EAS, **Distribution Certificate + Provisioning Profile**'ı otomatik üretip yönetmeyi teklif eder → **kabul et** ("Let EAS manage credentials"). Apple Developer hesabı şart olan kısım budur.
- `eas.json` production profili `buildType` (iOS) App Store dağıtımıdır; `autoIncrement: "buildNumber"` ile build numarası remote'tan artırılır (`appVersionSource: "remote"`).
- Build bitince `.ipa` üretilir (EAS'te saklanır; indirme gerekmez, submit doğrudan EAS'ten gönderir).

---

## Adım 7 — TestFlight'a gönder + iç test (opsiyonel ama önerilir)

**[Süre: ~10 dk submit + birkaç dk Apple işleme] [Kim: Ekrem/Claude]**

```bash
eas submit --profile production --platform ios --latest
```

- Build App Store Connect'e yüklenir, **TestFlight** sekmesinde görünür.
- İlk yüklemede Apple **Export Compliance** sorabilir → `usesNonExemptEncryption: false` sayesinde otomatik geçer (sormaz/otomatik "No").
- TestFlight > **Internal Testing** > kendini (ve istersen birkaç kişiyi) tester ekle → iPhone'da **TestFlight** uygulamasından Klinovax'ı kur, gerçek cihazda dene.
- Bu adım, App Store incelemesine göndermeden önce gerçek cihazda son kontrol için. Atlayıp doğrudan Adım 8'e geçebilirsin.

---

## Adım 8 — App Store'a submit + inceleme

**[Süre: ~10 dk + Apple incelemesi 24-48 saat] [Kim: Ekrem]**

1. App Store Connect > uygulaman > sürüm ("1.0 Prepare for Submission").
2. **Build** bölümünde Adım 6/7'de yüklenen build'i seç ("+ Build" → seç).
3. Tüm alanların yeşil olduğunu doğrula (Adım 3'teki listing + privacy + review notu + screenshots).
4. Sağ üst **"Add for Review" → "Submit for Review"**.
5. Apple inceler (tipik 24-48 saat). Onaylanınca:
   - **"Automatically release"** seçtiysen hemen yayınlanır,
   - **"Manually release"** seçtiysen sen "Release this version" deyince yayınlanır.

> İlk submit'lerde sık ret sebepleri ve nasıl kaçınılır → "Sık karşılaşılan sorunlar".

---

## Adım 9 — Yayın sonrası (sonraki sürümler)

**[Süre: her sürümde ~10 dk + build] [Kim: Ekrem/Claude]**

1. **JS-only değişiklik** (yeni native dep/plugin YOK): `eas update` ile OTA yeterli — store submission GEREKMEZ. (Bu repoda OTA kurulu; `runtimeVersion=appVersion`.)
2. **Native değişiklik veya sürüm artışı:** `app.json` > `expo.version` bump (örn. `1.0.0`→`1.0.1`) → `eas build --profile production --platform ios` → `eas submit ...` → App Store Connect'te yeni sürüm oluştur, "What's New" yaz, "Submit for Review".

---

## Sık karşılaşılan sorunlar (App Store)

- **Guideline 2.1 — "Unable to sign in" / boş ekran:** Review hesabı çalışmıyor veya eğitim atanmamış. Adım 3'teki test hesabını backend'de gerçekten oluştur + en az bir eğitim ata; biyometrik kilidin atlanabildiğini nota yaz (zaten yazılı).
- **Guideline 5.1.1 — Privacy:** `https://klinovax.com/privacy` 200 dönmüyor veya App Privacy beyanı eksik. URL'yi canlı tut, App Privacy'yi doldur.
- **Guideline 5.1.2 — Data use:** App Privacy beyanı ile gerçek davranış uyuşmuyor. `listing-ios.md`'deki tablo gerçek koda göre; ekstra veri ekleme.
- **Missing screenshots (iPad):** `supportsTablet: true` ise 13" iPad screenshot zorunlu. iPad görseli ekle veya `supportsTablet: false` yap (Adım 3 kararı).
- **Guideline 4.0 — Design / login-only:** Apple bazen "kurumsal, herkese açık olmayan" uygulamaları soruşturur. İnceleme notunda "yalnızca kurum personeli, bireysel kayıt yok" açıkça yazılı (zaten metinde). Gerekirse Apple'a kurumsal kullanım olduğunu yinele.
- **Export compliance takılması:** `usesNonExemptEncryption: false` ayarlı olduğundan otomatik geçer; manuel sorarsa "No" / "Exempt" seç.
