# Gelmemeyegidenkitapkurdu Web Sitesi

Bu proje Netlify üzerinde yayınlanacak şekilde düzenlenmiş React + TypeScript tabanlı bir web uygulamasıdır.

## Kurulu Altyapı

- Frontend: React + Vite + Tailwind
- Veri katmanı: Supabase (auth + tablo CRUD + RPC)
- CI/CD: GitHub Actions
- Yayın: Netlify (`netlify.toml` + SPA redirect)

## Dosya Düzeni

- `src/` uygulama kaynak kodu
- `src/lib/supabaseClient.ts` Supabase bağlantısı
- `src/api/client.ts` Supabase veri erişim katmanı
- `src/store/useStore.ts` uygulama state yönetimi
- `database/supabase_init.sql` Supabase şema + RLS + fonksiyonlar
- `.github/workflows/ci-build-netlify.yml` build kontrolü
- `.github/workflows/netlify-production-deploy.yml` Netlify deploy pipeline
- `netlify.toml` Netlify build/yayın ayarları
- `public/_redirects` SPA route yönlendirmesi
- `.env.example` gerekli ortam değişkenleri

## Gerekli Ortam Değişkenleri

Aşağıdaki değerleri proje ortamında tanımlayın:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

## GitHub Secrets (Deploy Workflow için)

Aşağıdaki secrets değerlerini GitHub repository içine ekleyin:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

## Supabase Kurulum

1. `database/supabase_init.sql` dosyasını Supabase SQL Editor içinde çalıştırın.
2. `gelmemeyegidenkitapkurdu@gmail.com` e-posta hesabını Auth altında admin kullanıcı olarak oluşturun.
3. Gerekirse `VITE_ADMIN_EMAIL` değerini değiştirin.

## Netlify Ayarları

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Node version: `20`

Bu ayarlar `netlify.toml` içinde hazırdır.
