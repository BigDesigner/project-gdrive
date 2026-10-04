# Project GDrive (Rescue Vault)

Acil durumlarda (incident response, triage, log toplama vb.) küçük dosyaları ve delilleri doğrudan kişisel Google Drive (15 GB) hesabına aktarmak için geliştirilmiş hafif bir araç.

Frontend Cloudflare Pages üzerinde, API ise Cloudflare Worker üzerinde çalışır. Tamamen ücretsiz katmanda (Always Free) kalacak şekilde tasarlanmıştır.

## Özellikler

- Sürükle-bırak dosya yükleme (masaüstü ve mobil uyumlu)
- İstemci tarafında otomatik SHA-256 hash hesaplama
- Opsiyonel istemci taraflı AES-256-GCM şifreleme (tarayıcıda PBKDF2 ile şifrelenir)
- Google Drive API (OAuth2 refresh token ile 15 GB kotayı kullanır)
- Opsiyonel Discord ve Telegram yükleme bildirimleri
- Tek yönetici şifresiyle korunan oturum

## Kurulum

```bash
pnpm install
```

### 1. Google OAuth Token Alma
Google Cloud Console'da açtığınız OAuth 2.0 Web Client bilgilerini kullanarak refresh token üretin:

```bash
pnpm run auth:token
```

### 2. Ortam Değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayıp gerekli anahtarları girin.

### 3. Yerel Çalıştırma
```bash
# Worker API
pnpm run dev

# Testler
pnpm test
```

## Canlıya Alma (Deploy)

```bash
# Worker API dağıtımı (gdrive-api)
pnpm run deploy:api

# Frontend dağıtımı (gdrive-frontend)
pnpm run deploy:frontend
```

## Şifrelenmiş Dosyaları Çözme
Arayüzde AES şifreleme açıkken yüklenen `.enc` dosyalarını yerel makinenizde açmak için:

```bash
pnpm run decrypt -- --file dosya.enc --password sifreniz
```
