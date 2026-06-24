# Proje Hafızası - Gelmemeyegidenkitapkurdu

## Proje Özeti

Bu proje Netlify üzerinde yayınlanacak şekilde optimize edilmiş bir React + TypeScript web uygulamasıdır. Veri katmanı Supabase ile çalışır.

## Kesin Teknoloji Kararları

- Frontend: React 18 + TypeScript + Vite
- Stil: Tailwind CSS (dark mode: 'class' stratejisi ile)
- State: Zustand (persist: localStorage ile)
- Backend servisleri: Supabase (REST/RPC/Auth)
- CI/CD: GitHub Actions
- Hosting: Netlify

## Kalıcı Geliştirme Kuralları

1. Framework değişimi yapılmaz; React + Vite korunur.
2. Veri erişimleri `src/api/client.ts` üzerinden yürütülür.
3. Supabase istemcisi tek noktadan (`src/lib/supabaseClient.ts`) yönetilir.
4. Admin oturum kontrolü store katmanında (`src/store/useStore.ts`) tutulur.
5. Netlify SPA yönlendirmesi için `public/_redirects` korunur.
6. Netlify yapılandırması `netlify.toml` üzerinden yönetilir.
7. Üretim öncesi `npm install` ardından `npm run build` sırası zorunludur.
8. Projede gereksiz template dosyaları ve artık klasörler tutulmaz.

## Dark Mode (Karanlık Mod)

- Tailwind `darkMode: 'class'` stratejisi kullanılır.
- Zustand store'da `darkMode` durumu `persist` ile localStorage'da saklanır.
- Toggle butonu Ana Sayfa'da SectionCard'ların üzerindedir.
- `document.documentElement.classList.add/remove('dark')` ile HTML root'a dark class'ı eklenir.
- Tüm sayfalarda `bg-white`, `bg-gray-800`, `text-gray-*` sınıfları dark mode ile desteklenir.
- Form inputları, modallar, kartlar ve metin renkleri dark mode'da uyumlu çalışır.
- Öneriler ve Röportajlar sayfalarında ayrı arama kutusu bulunur; arama kutusu stili sabittir (dışı pembe, açık modda içi beyaz, karanlık modda içi siyah).
- Admin girişi ve tüm CRUD işlemleri dark mode'dan etkilenmez.

## Supabase Bağlantı Bilgileri

- Project ID: `oxqobtlcbksfdajnvnoz`
- Project URL: `https://oxqobtlcbksfdajnvnoz.supabase.co`
- Kullanılan SQL şema dosyası: `database/supabase_init.sql`

## Veri Kalıcılığı ve Admin Kuralları

1. Admin düzenlemeden hiçbir içeriğin yeri veya değeri değişmez.
2. Admin girişi yapılmadan içerik yayınlanamaz, düzenlenemez veya silinemez.
3. Sayfa yenilendiğinde veriler kaybolmaz — tüm veri Supabase'de kalıcı olarak tutulur.
4. Admin silmeden hiçbir içerik silinmez (RLS politikaları ile korunur).
5. Görüntüleme sayıları yalnızca admin tarafından değiştirilebilir.
6. Her içerik yayınlandığı günün tarihini taşır; tarih sonradan değişmez.
7. Site arayüzü, yayınlama veya düzenleme akışı sebepsiz değiştirilmez.

## Veritabanı Sütun Eşlemesi

| Tablo | Görüntüleme Sütunu | Tarih Sütunu |
|-------|-------------------|--------------|
| writings | views | date |
| books | views | created_at |
| suggestions | views | created_at |
| polls | view_count | date |
| interviews | view_count | created_at |
| announcements | views | date |

## Books (Dergiler) Tablosu Detayları

- books tablosu: id, title, cover, description, pdf, participant1, participant2, dialogues, photo, views, created_at, **owner, content, downloads, pdf_name, issue**
- `owner` = Hak Sahibi, `content` = Dergi içeriği, `pdf_name` = PDF indirme butonu adı, `downloads` = indirme sayısı, `issue` = Dergi Sayısı (kapak badgesinde görünür)
- Mevcut verilerde participant1 → owner, description → content olarak taşındı
- Migrasyon SQL: `database/add_book_fields.sql`

## Performans Optimizasyonları (Dergiler)

- `fetchBooks()` listede gerekli alanları çeker; detay akışında PDF indirme için `pdf` alanı da güvenli şekilde taşınır
- `fetchBooks()` şema uyumluluğu için geriye dönük (legacy) fallback içerir; yeni sütunlardan biri eksikse eski sütun setiyle sorgu yapıp dergilerin kaybolmasını engeller
- `createBook()` ve `updateBook()` PDF base64 verisini önce Storage'a yükleyip tabloya URL kaydeder
- `fetchBookPdf(id)` ile detay akışında PDF doğrulama/yedek yükleme yapılır
- PDF indirme butonu doğrudan dosya indirme akışını kullanır ve Storage URL üzerinde `?download=` parametresi ile tarayıcıda açmak yerine dosyayı indirmeyi zorlar
- Aynı dergi detay açılışında indirme sayacı yalnızca ilk tıklamada +1 artar; detaydan çıkıp yeniden girildiğinde sayaç tekrar bir kez artabilir
- PDF yüklemede dosya tipi (`application/pdf` + `.pdf`), imza (`%PDF-`) ve boyut (maks. 50MB) doğrulaması uygulanır
- Dergi PDF güncellemesinde önce yeni PDF yüklenir, veritabanı başarıyla güncellendikten sonra eski PDF silinir; böylece güncelleme hatasında eski PDF korunur
- Dergi silinmeden PDF silinmez; dergi admin tarafından silinirse ilişkilendirilmiş PDF dosyası da Storage’dan temizlenir
- Sunucu tarafı sıralama (`created_at` ile) kullanılır

## Performans Optimizasyonları (Yazılar & Röportajlar)

- `fetchWritings()` list sorgusunda `content` sütununu hariç tutar (sadece gerekli sütunlar); large text payload engellenir
- `fetchWritingContent(id)` ile tam içerik yalnızca okuma modunda isteğe bağlı yüklenir
- `fetchInterviews()` dialogues hariç listeleme yapar; listeleme hızlanır
- `fetchInterviewDialogues(id)` ile diyaloglar yalnızca okuma modunda isteğe bağlı yüklenir
- Tüm listeleme sorgularında sunucu tarafı sıralama (`.order()`) kullanılır
- Okuma modunda yükleme göstergesi (spinner) gösterilir
- Admin düzenleme akışında da lazy loading desteklenir

## Şema Dayanıklılığı (Tüm Sayfalar)

- `src/api/client.ts` içinde books dışında kalan sayfalara da kolon-drift dayanıklılığı eklendi
- `writings`, `suggestions`, `polls`, `interviews`, `dialogues`, `announcements` akışlarında modern sorgu başarısız olup eksik kolon hatası dönerse legacy sütun setiyle otomatik fallback uygulanır
- Legacy fallback yalnızca eksik kolon durumunda devreye girer; diğer hatalar doğrudan hata olarak yükseltilir
- Listeleme verileri fallback yolunda da UI kırılmaması için güvenli varsayılan değerlerle normalize edilir
- Create/Update akışlarında yeni kolonları içeren payload önce denenir, eksik kolon hatasında eski payload ile tekrar yazılır

## Notlar

- Güvenlik uyarılarının bir bölümü geçmişten gelen `yw_*` tablolarından kaynaklanır.
- Uygulamanın aktif akışı `admin_profile`, `writings`, `books`, `suggestions`, `polls`, `poll_options`, `interviews`, `dialogues`, `announcements` tablolarını kullanır.

## Anket Oy Güvenliği Kuralı

- Anketlerde normal ziyaretçi aynı ankete yalnızca bir kez oy verebilir ve bu kural sayfa yenileme/siteye geri dönüşte de korunur.
- Admin kullanıcı için çoklu oy verme izni korunur.
- Oy sayım mantığına (vote_poll_option ve toplam oy hesaplaması) dokunulmaz.

## Yayın Öncesi Doğrulama Notu

- Netlify ile uyum kontrolü için `npm ci && npm run build` komutu başarılı şekilde doğrulandı.
- Tip güvenliği doğrulaması için `npx tsc --noEmit` komutu başarılı şekilde doğrulandı.

## Admin Giriş Güvenliği

- Admin giriş akışı iki adımlıdır: önce e-posta + şifre kontrolü, ardından e-postaya gönderilen 6 haneli onay kodu doğrulaması.
- Onay kodu doğrulanmadan admin oturumu aktif edilmez.
- Giriş ekranındaki şifre alanında nokta (`••••`) placeholder kullanılmaz.
- Admin şifre e-posta adresi (`gelmemeyegidenkitapkurdu@gmail.com`) değiştirilmez.

## Admin Güvenlik Kodu Akışı

- E-posta kodu yerine ikinci adımda sabit 6 haneli güvenlik kodu doğrulanır.
- Şifre doğrulaması başarılı olduktan sonra kullanıcıdan `286628` güvenlik kodu istenir.
- Giriş ekranındaki bilgilendirme metinlerinde mail üzerinden kod gönderimi ifadesi kullanılmaz.


## 2026-06 Giriş Ekranı Güvenlik Sertleştirmesi

- Kullanıcı talebine uygun olarak admin giriş akışı, mevcut içerikler ve içerik yayınlama/yayın sonrası davranışlar korunur; bu alanlara güvenlik işi dışında müdahale edilmez.
- `src/api/client.ts` içinde admin giriş doğrulamasına katmanlı kaba kuvvet koruması uygulanır:
  - başarısız deneme sayacı,
  - adaptif gecikme,
  - belirli eşik sonrası zamanlı kilit,
  - başarılı girişte güvenlik durumunun temizlenmesi.
- Kimlik doğrulama hataları keşif yüzeyini azaltmak için genelleştirilmiş mesajla gösterilir; yalnızca kilitlenme durumu kullanıcıya net süre bilgisiyle verilir.
- `src/pages/Login.tsx` içinde bot/suistimal azaltımı için honeypot alanı, çok hızlı gönderim engeli, tekrar submit guard ve giriş alanı kısıtları korunur.
- `netlify.toml` üzerinden güvenlik başlıkları zorunlu tutulur (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) ve `/login` için no-store/no-cache/noindex politikası korunur.
- Bu sertleştirmelerde temel ilke: admin giriş deneyimini bozmadan saldırı yüzeyini daraltmak ve tahmin/deneme saldırılarını zorlaştırmaktır.


## 2026-06 Yazılar Tıklama Takılma Düzeltmesi

- Yazılar ekranında kart tıklamasında görülen kısa donma giderildi.
- Okuma modalı anında açılacak şekilde akış düzenlendi; içerik eksikse arka planda yüklenip kullanıcıya bekleme mesajı gösterilir.
- Modal içeriğinde aynı yazıyı tekrar tekrar arayan işlemler azaltıldı; seçili yazı tek referanstan kullanılır.
- Düzeltme admin giriş akışına veya yayınlanmış içerik davranışlarına dokunmadan uygulanmıştır.


## 2026-06 Yazılar Açılış Davranışı

- Kullanıcı isteği doğrultusunda yazı detayında "Yazı yükleniyor..." metni kaldırıldı.
- Kart tıklamasında içerik önce arka planda tamamlanır, ardından modal açılır; kullanıcıya doğrudan içerik gösterilir.
- Liste kartlarında mouse-enter ile içerik önceden ısıtılır (prefetch) ve açılış gecikmesi azaltılır.

## 2026-06 Admin Başlık Arka Planı Yönetimi

- Kullanıcı isteğiyle admin panelindeki Profil Düzenle ekranına, sadece başlıktaki GELMEMEYEGİDENKİTAPKURDU yazısının arkasındaki görseli değiştiren ayrı bir alan eklendi.
- Değişiklik yalnızca başlık arka plan görselini etkiler; yayınlanmış içeriklere, içerik sıralarına, yayın tarihlerine ve yayın sonrası davranışlara dokunulmaz.
- Veri uyumluluğu için `admin_profile.header_image` alanı kullanılır; alan yoksa uygulama otomatik olarak varsayılan başlık görseliyle çalışmaya devam eder.

## 2026-06 Yazı ve Duyuru Yayınlama Anlık Yansıma Düzeltmesi

- Kullanıcı isteğiyle yazı ve duyuru ekleme/düzenleme/silme akışında görülen geç yansıma sorunu, mevcut arayüz ve işleyiş korunarak giderildi.
- `src/store/useStore.ts` içinde yazılar ve duyurular için optimistic güncelleme modeli uygulandı: kullanıcı işlemi sonrası liste anında güncellenir, arka planda uzak kayıt tamamlanır.
- Uzak kayıt hatasında otomatik rollback uygulanır; başarısız işlem kalıcı görünmez ve mevcut veri bütünlüğü korunur.
- Değişiklik mevcut teknoloji yığınına ve admin/publish davranışlarına dokunmadan yapıldı.

## 2026-06 Başlık Metni Mikro Boyut Düzeltmesi

- Kullanıcı isteğine göre üst başlıktaki `GELMEMEYEGİDENKİTAPKURDU` metni çok az küçültüldü.
- Sondaki `U` harfinin alt satıra kayma problemi için başlık satırı tek satıra sabitlendi ve satır yüksekliği optimize edildi.
- Değişiklik yalnızca başlık tipografisine uygulandı; diğer sayfa yapıları ve içerik akışları korunmuştur.

## 2026-06 Mobil Başlık Bulanıklık İyileştirmesi

- Kullanıcı geri bildirimi doğrultusunda mobil ekranda ana sayfa başlık görseli ve `GELMEMEYEGİDENKİTAPKURDU` metnindeki bulanıklık azaltıldı.
- Başlık görselinde keskinlik odaklı render ayarları eklendi (`header-hero-image`) ve mobilde algılanan blur etkisini artıran katmanlar sadeleştirildi.
- Mobil görünümde başlık metninin parıltı animasyonu kapatıldı; böylece harfler daha net ve stabil görünür.
- Değişiklik yalnızca başlık alanı görsel netliğine odaklanır; içerik yapısı ve diğer akışlar korunur.

## 2026-06 Başlık Artistik Giriş + Sık Işık Geçişi

- Kullanıcı isteği doğrultusunda `GELMEMEYEGİDENKİTAPKURDU` başlığı için siteye ilk girişte artistik bir giriş animasyonu eklendi (yumuşak yükselme + netleşme etkisi).
- Başlık üzerindeki beyaz ışık geçişinin frekansı artırıldı; daha sık ve belirgin parıltı akışı sağlandı.
- Başlık harflerinde hafif gri-gümüş ton korunarak parlama etkisi daha canlı hale getirildi.
- Görsel kimlik korunurken sadece başlık animasyon deneyimi güçlendirilmiştir.


## 2026-06 Güvenlik ve Mobil/Tarayıcı Uyumluluk Sertleştirmesi

- Kullanıcı isteği doğrultusunda repo içi güvenlik taraması + bağımlılık denetimi yapıldı; bilinen açıklar kapatıldı ve üretim derlemesi temiz geçti.
- `react-router-dom` sürümü `6.30.4` seviyesine yükseltilerek open-redirect açığına karşı güncel güvenlik yaması uygulandı.
- `@supabase/supabase-js` güncellenerek `ws` zincirindeki bilinen güvenlik açıkları giderildi; `pnpm audit --prod` sonucu temizlendi.
- Dergiler (Books) PDF indirme akışı mobil ve tarayıcı farklılıklarına dayanıklı çoklu fallback ile güçlendirildi:
  - data URL doğrudan indirme,
  - güvenli dış URL doğrulaması,
  - blob üzerinden indirme,
  - iOS ve popup engelleme senaryoları için yeni sekmede açma fallback.
- Home ve Suggestions sayfalarında kullanıcı kaynaklı dış bağlantılar için güvenli URL sanitize katmanı eklendi; `javascript:` benzeri zararlı şemalar engellenir.
- Geçersiz dış bağlantı durumunda kullanıcıya kırık link yerine güvenli pasif durum (devre dışı buton/metin) gösterilir.
