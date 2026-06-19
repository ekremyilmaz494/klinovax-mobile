/**
 * Yasal metinler — uygulama içinde native render edilir (tarayıcı yönlendirmesi yok).
 * Kaynak: hospital-lms web sayfaları (kvkk / terms / privacy). Site metni değişirse
 * BURASI elle senkronlanmalı (backend bu repoda değiştirilemez — kural #11).
 */

export type LegalSection = {
  heading: string;
  /** Paragraflar — her biri ayrı <Text>. */
  body?: string[];
  /** Madde listesi (varsa). */
  items?: string[];
};

export type LegalDoc = {
  title: string;
  /** 'Son güncelleme' tarihi (sayfada varsa, ham metin). */
  updatedAt?: string;
  /** İlk bölümden önceki giriş paragrafları. */
  intro?: string[];
  sections: LegalSection[];
};

export type LegalSlug = 'kvkk' | 'terms' | 'privacy';

export const LEGAL_CONTENT: Record<LegalSlug, LegalDoc> = {
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    updatedAt: 'Nisan 2026',
    intro: [
      'Kişisel Verilerin Korunması Kanunu kapsamında veri işleme faaliyetlerimize ilişkin aydınlatma metni.',
    ],
    sections: [
      {
        heading: '1. Veri Sorumlusu',
        body: [
          'KlinoVax Suite olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda ve kanuna uygun olarak işlemekteyiz.',
        ],
      },
      {
        heading: '2. Kişisel Verilerin İşlenme Amacı',
        body: [
          'Kişisel verileriniz; personel eğitim süreçlerinin yönetilmesi, sınav ve değerlendirme faaliyetlerinin gerçekleştirilmesi, eğitim performansının raporlanması, yasal yükümlülüklerin yerine getirilmesi, sertifika düzenlenmesi, bilgi güvenliği süreçlerinin yürütülmesi ve iletişim faaliyetlerinin yönetilmesi amaçlarıyla işlenmektedir.',
        ],
      },
      {
        heading: '3. İşlemenin Hukuki Sebepleri',
        body: [
          'Kişisel verileriniz aşağıdaki hukuki sebeplere dayanılarak işlenmektedir (KVKK md. 5/2):',
        ],
        items: [
          'md. 5/2-c — Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (iş akdi gereği eğitim kayıtlarının tutulması)',
          'md. 5/2-ç — Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi (Sağlık Bakanlığı zorunlu eğitim gereksinimleri)',
          'md. 5/2-f — Veri sorumlusunun meşru menfaatleri için zorunlu olması (platform güvenliği, sistem yönetimi)',
        ],
      },
      {
        heading: '4. İşlenen Kişisel Veriler',
        items: [
          'Ad ve Soyad',
          'E-posta adresi',
          'Departman ve unvan bilgisi',
          'Sınav sonuçları ve başarı durumu',
          'Video izleme kayıtları ve ilerleme bilgileri',
          'Oturum açma zaman damgaları ve IP adresi (audit log)',
        ],
      },
      {
        heading: '5. Verilerin Aktarılması',
        body: [
          'Kişisel verileriniz, hizmetin sunulabilmesi için aşağıdaki üçüncü taraf hizmet sağlayıcılarla paylaşılabilir:',
          "Verileriniz yurt dışına aktarılırken KVKK'nın 9. maddesi kapsamında gerekli güvenceler sağlanmaktadır.",
        ],
        items: [
          'Supabase (Avrupa Birliği) — Kimlik doğrulama ve veritabanı hizmetleri',
          'Amazon Web Services S3 (Avrupa Birliği) — Video depolama ve içerik dağıtımı',
          'Vercel Inc. (Avrupa Birliği) — Uygulama hosting ve CDN hizmetleri',
        ],
      },
      {
        heading: '6. Veri Saklama Süresi',
        body: [
          'Kişisel verileriniz aşağıdaki süreler boyunca saklanır:',
          'Saklama süresinin dolması veya işleme amacının ortadan kalkması halinde veriler silinir ya da anonim hale getirilir.',
        ],
        items: [
          'Kimlik ve iletişim bilgileri (ad, e-posta): İş akdi sona ermesinden itibaren 10 yıl (BK md. 146)',
          'Video izleme kayıtları ve sertifikalar: 5 yıl',
          'IP adresi ve audit loglar: 2 yıl',
        ],
      },
      {
        heading: '7. Veri Sahibinin Hakları',
        body: ["KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:"],
        items: [
          'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
          'Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme',
          'Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme',
          'Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme',
          'Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme',
          "KVKK'nın 7. maddesi kapsamında kişisel verilerinizin silinmesini veya yok edilmesini isteme",
          'İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme',
        ],
      },
      {
        heading: '8. İletişim',
        body: [
          'KVKK kapsamındaki haklarınızı kullanmak için aşağıdaki kanallardan bizimle iletişime geçebilirsiniz. Başvurularınız en geç 30 (otuz) gün içinde sonuçlandırılacaktır.',
          'E-posta: kvkk@klinovax.com',
        ],
      },
    ],
  },

  terms: {
    title: 'Kullanım Koşulları',
    updatedAt: '5 Nisan 2026',
    sections: [
      {
        heading: '1. Hizmet Tanimi',
        body: [
          'KlinoVax Eğitim Platformu ("Platform"), kurumlar bunyesinde calisan personelin mesleki egitim, sinav ve sertifikasyon sureclerini dijital ortamda yonetmek amaciyla sunulan bir bulut tabanli ogrenme yonetim sistemidir. Platform, egitim iceriklerinin olusturulmasi, atanmasi, takip edilmesi ve raporlanmasi hizmetlerini kapsar.',
        ],
      },
      {
        heading: '2. Kullanici Yukumlulukleri',
        items: [
          'Kullanici, platforma erisim icin kendisine tanimlanan hesap bilgilerini gizli tutmakla yukumludur. Hesap bilgilerinin ucuncu kisilerle paylasilmasindan dogan tum sorumluluk kullaniciya aittir.',
          'Platform uzerindeki egitim iceriklerine yalnizca atandigi kapsam dahilinde erisim saglanabilir. Yetkisiz erisim girisimleri tespit edildiginde hesap askiya alinabilir.',
          'Kullanici, platformu yalnizca mesleki egitim ve gelisim amaciyla kullanmayi kabul eder. Platformun kotuye kullanimi, yasadisi icerik paylasimi veya sistem butunlugunu tehdit eden davranislar kesinlikle yasaktir.',
          'Sinav sureclerinde kopya cekmek, baskalari adina sinava girmek veya sistem acikliklari uzerinden haksiz avantaj elde etmeye calismak disiplin islemi gerektirir.',
        ],
      },
      {
        heading: '3. Fikri Mulkiyet',
        body: [
          'Platform uzerindeki tum yazilim, tasarim, logo, icerik ve egitim materyalleri KlinoVax Eğitim Platformu ve/veya ilgili icerik saglayicilarinin fikri mulkiyetindedir. Bu materyaller, onceden yazili izin alinmaksizin kopyalanamaz, dagitilmaz, degistirilemez veya ticari amacla kullanilamaz. Kullanicilar tarafindan platforma yuklenen icerikler uzerindeki haklar, ilgili organizasyona aittir.',
        ],
      },
      {
        heading: '4. Veri Guvenligi',
        body: [
          'Platform, kullanici verilerinin korunmasi icin endüstri standartlarinda guvenlik onlemleri uygular. Veriler sifrelenmis baglanti (TLS/SSL) uzerinden iletilir ve sunucularda sifrelenmis olarak saklanir. Detayli bilgi icin Gizlilik Politikamizi inceleyebilirsiniz.',
        ],
      },
      {
        heading: '5. Hizmet Seviyesi',
        body: [
          'KlinoVax Eğitim Platformu, aylik %99,5 erisim orani hedeflemektedir. Planli bakim calismalari, en az 48 saat onceden kullanicilara bildirilir. Mucbir sebepler (dogal afet, siber saldiri, altyapi saglayici kaynakli kesintiler vb.) nedeniyle olusan hizmet kesintilerinden KlinoVax Eğitim Platformu sorumlu tutulamaz.',
        ],
      },
      {
        heading: '6. Fesih Kosullari',
        items: [
          'Organizasyonlar, abonelik doneminin sonunda sozlesmeyi feshedebilir. Fesih bildirimi en az 30 gun onceden yazili olarak yapilmalidir.',
          'Kullanim sartlarinin ihlali halinde, KlinoVax Eğitim Platformu ilgili hesabi veya organizasyonu onceden bildirimde bulunmaksizin askiya alma veya feshetme hakkini sakli tutar.',
          'Fesih durumunda organizasyona ait veriler, talep uzerine 30 gun icerisinde disa aktarilabilir formatta teslim edilir. Bu surenin ardından veriler kalici olarak silinir.',
        ],
      },
      {
        heading: '7. Sorumluluk Sinirlamasi',
        body: [
          "KlinoVax Eğitim Platformu, platformun kullanimindan kaynaklanan dolayli, ozel, arizi veya cezai zararlardan sorumlu degildir. KlinoVax Eğitim Platformu'in toplam sorumlulugu, her halukarda ilgili organizasyonun son 12 ayda odedigi abonelik bedelini asamaz. Platform uzerinden sunulan egitim icerikleri bilgilendirme amacli olup, tibbi tavsiye niteliginde degildir.",
        ],
      },
      {
        heading: '8. Uyusmazlik Cozumu',
        body: [
          'Bu kullanim sartlarindan dogan uyusmazliklarda Turkiye Cumhuriyeti kanunlari uygulanir. Taraflar, oncelikle uzlasma yoluyla cozum aramayi kabul eder. Uzlasma saglanamadigi takdirde Ankara Mahkemeleri ve Icra Daireleri yetkilidir.',
        ],
      },
      {
        heading: '9. Degisiklik Hakki',
        body: [
          'KlinoVax Eğitim Platformu, bu kullanim sartlarini onceden bildirimde bulunarak degistirme hakkini sakli tutar. Onemli degisiklikler, yururluge girmesinden en az 15 gun once platform uzerinden ve/veya e-posta yoluyla kullanicilara bildirilir. Degisikliklerin yururluge girmesinden sonra platformu kullanmaya devam etmeniz, guncellenmis sartlari kabul ettiginiz anlamina gelir.',
        ],
      },
      {
        heading: 'Iletisim',
        body: ['Bu kullanim sartlari hakkinda sorulariniz icin bizimle iletisime gecebilirsiniz:'],
        items: [
          'E-posta: destek@klinovax.com',
          'Telefon: +90 850 000 0000',
          'Adres: Ankara, Turkiye',
        ],
      },
    ],
  },

  privacy: {
    title: 'Gizlilik Politikası',
    updatedAt: '5 Nisan 2026',
    sections: [
      {
        heading: '1. Veri Sorumlusu',
        body: [
          '6698 sayili Kisisel Verilerin Korunmasi Kanunu ("KVKK") kapsaminda veri sorumlusu sifatiyla hareket eden taraf:',
        ],
        items: [
          'Unvan: Hastane LMS Yazilim Teknolojileri',
          'Adres: Ankara, Turkiye',
          'E-posta: kvkk@klinovax.com',
          'Telefon: +90 850 000 0000',
        ],
      },
      {
        heading: '2. Toplanan Kisisel Veriler',
        body: ['Platform uzerinde asagidaki kisisel veri kategorileri islenmektedir:'],
        items: [
          'Kimlik Bilgileri: Ad, soyad, T.C. kimlik numarasi, unvan, departman bilgisi',
          'Iletisim Bilgileri: E-posta adresi, telefon numarasi',
          'Mesleki Bilgiler: Gorev tanimi, calisan numarasi (HIS entegrasyonu), sertifika ve yetkinlik bilgileri',
          'Egitim ve Sinav Verileri: Egitim tamamlama durumlari, sinav sonuclari, video ilerleme kayitlari, sertifika bilgileri',
          'Erisim ve Kullanim Verileri: Oturum acma zamanlari, IP adresi, tarayici bilgisi, platformdaki etkinlik kayitlari',
          'Gorsel Veriler: Profil fotografi (istege bagli)',
        ],
      },
      {
        heading: '3. Kisisel Verilerin Isleme Amaclari',
        items: [
          'Platform hizmetlerinin sunulmasi ve iyilestirilmesi',
          'Kullanici kimlik dogrulama ve yetkilendirme islemleri',
          'Egitim atama, takip ve raporlama sureclerinin yurutulmesi',
          'Sinav uygulama, degerlendirme ve sertifikasyon islemleri',
          'Yasal yukumluluklerin yerine getirilmesi (saglik personeli egitim kayitlari)',
          'Platform guvenliginin saglanmasi ve kotuye kullaniminin onlenmesi',
          'Istatistiksel analiz ve raporlama (anonimlestirilmis verilerle)',
          'Kullaniciya yonelik bilgilendirme ve destek hizmetleri',
        ],
      },
      {
        heading: '4. Kisisel Veri Islemenin Hukuki Dayanaklari',
        body: [
          "Kisisel verileriniz, KVKK'nin 5. ve 6. maddelerinde belirtilen asagidaki hukuki dayanaklara istinaden islenmektedir:",
        ],
        items: [
          'Sozlesmenin ifasi (m.5/2-c): Platform hizmetlerinin sunulmasi icin gerekli veri isleme faaliyetleri',
          'Hukuki yukumluluk (m.5/2-c): Saglik mevzuati geregi personel egitim kayitlarinin tutulmasi',
          'Mesru menfaat (m.5/2-f): Platform guvenliginin saglanmasi, hizmet kalitesinin arttirilmasi',
          'Acik riza (m.5/1): Zorunlu olmayan veri isleme faaliyetleri (ornegin pazarlama iletisimleri)',
        ],
      },
      {
        heading: '5. Kisisel Verilerin Aktarimi',
        body: [
          'Kisisel verileriniz asagidaki durumlarda ucuncu taraflarla paylasilabilir:',
          "Kisisel verileriniz yurt disindaki sunucularda islenmektedir. Bu aktarim, KVKK'nin 9. maddesi kapsaminda yeterli koruma bulunan ulkelere veya yeterli korumayi taahhut eden veri isleyenlerine yapilmaktadir.",
        ],
        items: [
          'Altyapi Saglayicilari: Sunucu barindirma (Vercel, Supabase), dosya depolama (AWS), onbellek (Upstash Redis) hizmetleri icin teknik altyapi saglayicilariyla. Bu saglayicilar GDPR ve/veya esdeger veri koruma standartlarina uymaktadir.',
          'Organizasyonunuz: Bagli oldugunuz saglik kurulusu yoneticileri, yetkileri dahilinde egitim ve sinav verilerinize erisebilir.',
          'Yasal Zorunluluklar: Yetkili kamu kurum ve kuruluslarina, mevzuatin gerektirdigi hallerde veri aktarimi yapilabilir.',
        ],
      },
      {
        heading: '6. Veri Saklama Sureleri',
        body: [
          'Saklama suresi dolan veriler, periyodik imha sureci kapsaminda otomatik olarak silinir veya anonimlestirilir.',
        ],
        items: [
          'Hesap Bilgileri: Hesap aktif oldugu surece ve hesap kapatildiktan sonra 1 yil',
          'Egitim ve Sinav Kayitlari: Saglik mevzuati geregi en az 10 yil (yasal zorunluluk)',
          'Sertifika Bilgileri: Sertifikanin gecerlilik suresi boyunca ve sonrasinda 5 yil',
          'Erisim Kayitlari (Log): 2 yil',
          'Cerez Verileri: Oturum cerezleri tarayici kapatildiginda, kalici cerezler en fazla 1 yil',
        ],
      },
      {
        heading: '7. KVKK Kapsamindaki Haklariniz (Madde 11)',
        body: [
          "KVKK'nin 11. maddesi uyarinca asagidaki haklara sahipsiniz:",
          'Haklarinizi kullanmak icin kvkk@klinovax.com adresine yazili basvuruda bulunabilir veya platform uzerindeki KVKK basvuru formunu kullanabilirsiniz. Basvurulariniz en gec 30 gun icerisinde sonuclandirilacaktir.',
        ],
        items: [
          'Kisisel verilerinizin islenip islenmedigini ogrenme',
          'Kisisel verileriniz islenmisse buna iliskin bilgi talep etme',
          'Kisisel verilerinizin islenme amacini ve bunlarin amacina uygun kullanilip kullanilmadigini ogrenme',
          'Yurt icinde veya yurt disinda kisisel verilerinizin aktarildigi ucuncu kisileri bilme',
          'Kisisel verilerinizin eksik veya yanlis islenmis olmasi halinde bunlarin duzeltilmesini isteme',
          "KVKK'nin 7. maddesinde ongornulen sartlar cercevesinde kisisel verilerinizin silinmesini veya yok edilmesini isteme",
          'Duzeltme ve silme islemlerinin, kisisel verilerin aktarildigi ucuncu kisilere bildirilmesini isteme',
          'Islenen verilerin munhasiran otomatik sistemler vasitasiyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya cikmasina itiraz etme',
          'Kisisel verilerinizin kanuna aykiri olarak islenmesi sebebiyle zarara ugramaniz halinde zararin giderilmesini talep etme',
        ],
      },
      {
        heading: '8. Cerez Politikasi',
        body: [
          'Platform asagidaki cerez turlerini kullanmaktadir:',
          'Tarayicinizin cerez ayarlarini degistirerek zorunlu olmayan cerezleri reddedebilirsiniz. Ancak bu durum, platformun bazi ozelliklerinin duzgun calismamasina neden olabilir.',
        ],
        items: [
          'Zorunlu Cerezler: Oturum yonetimi, kimlik dogrulama ve guvenlik icin gerekli cerezler. Bu cerezler olmadan platform islevlerini yerine getiremez.',
          'Islevsel Cerezler: Kullanici tercihlerinin (dil, tema secimi) hatirlanmasi icin kullanilir.',
          'Analitik Cerezler: Platform kullaniminin iyilestirilmesi icin anonimlestirilmis istatistik verileri toplar.',
        ],
      },
      {
        heading: '9. VERBIS Kayit Bilgileri',
        body: [
          "6698 sayili Kanun'un 16. maddesi uyarinca, KlinoVax Eğitim Platformu Veri Sorumlusu olarak Veri Sorumlulari Sicil Bilgi Sistemi'ne (VERBIS) kayitlidir.",
          'VERBIS kaydi hakkinda detayli bilgi icin: verbis.kvkk.gov.tr',
        ],
        items: [
          'Veri Sorumlusu: Hastane LMS Yazilim Teknolojileri',
          'VERBIS Kayit Numarasi: [Kayit tamamlaninca eklenecektir]',
          'Kayit Tarihi: [Kayit tamamlaninca eklenecektir]',
        ],
      },
      {
        heading: '10. Iletisim',
        body: [
          'Gizlilik politikamiz ve kisisel verilerinizin korunmasi hakkindaki tum soru ve talepleriniz icin:',
        ],
        items: [
          'Veri Sorumlusu Irtibat Kisisi: kvkk@klinovax.com',
          'Genel Destek: destek@klinovax.com',
          'Telefon: +90 850 000 0000',
          'Adres: Ankara, Turkiye',
        ],
      },
    ],
  },
};
