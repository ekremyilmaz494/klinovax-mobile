# Klinovax Mobile

Expo Router tabanlı React Native mobil uygulama. iOS hedefi EAS Build ve App Store Connect üzerinden yayınlanır.

## Kurulum

```bash
npm install
npm run start
```

Lokal backend kullanırken gerçek cihaz için `localhost` yerine Mac'in LAN IP adresini verin:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000 npm run start
```

Preview ve production EAS profilleri varsayılan olarak `https://klinovax.com` API'sine bağlanır.

## Kontroller

```bash
npm run lint
npx tsc --noEmit
npm run doctor
```

## iOS Build ve Submit

Apple Developer kaydı için Apple hesabıyla developer agreement kabul edilir:
https://developer.apple.com/register/

EAS build:

```bash
npm run eas:preview:ios
npm run eas:prod
```

App Store submit öncesi `eas.json` içindeki production iOS alanlarını gerçek değerlerle doldurun:

- `appleId`
- `ascAppId`
- `appleTeamId`

Bu değerler App Store Connect ve Apple Developer hesabından alınır. Placeholder değerlerle `eas submit` üretim gönderimi için hazır kabul edilmez.

## Manuel Test Akışları

- Login/logout ve ortak cihazda eski kullanıcı verisinin görünmediği cache temizliği
- Face ID / Touch ID açma, kapatma ve uygulama yeniden açılışı
- Push izin reddi/kabulü, token register ve logout unregister
- Offline sınav: cevap kaydet, uygulamayı kapat/aç, online olunca replay
- Access token refresh sonrası dashboard, video ve sertifika PDF akışları
- PDF eğitim içeriği ve video tamamlama sonrası son sınava geçiş
