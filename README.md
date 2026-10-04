# 🛡️ Rescue Vault // Blue Team & Incident Response Google Drive Kasa

Cloudflare Pages ve Google Drive API v3 üzerinde çalışan, **%100 Always Free (Tamamen Ücretsiz)**, tek yönetici parolalı, sürükle-bırak destekli ve acil durum adli bilişim (forensic triage) dosya kasası.

---

## ⚡ Temel Özellikler
- **%100 Always Free:** Sıfır sunucu maliyeti (Cloudflare Pages Limitsiz CDN + Günde 100.000 Ücretsiz Fonksiyon + 15 GB Ücretsiz Google Drive).
- **Kişisel Drive Desteği (Kota Sorunsuz):** Standart Service Account'ların 0 bayt kotasına takılmadan, OAuth 2.0 Refresh Token ile doğrudan kişisel 15 GB Drive alanınıza yazar.
- **Sürükle-Bırak & Otomatik Yükleme:** Dosya bırakıldığı anda anında kuyruğa alınır ve Google Drive'a stream edilir.
- **Mobil & Tablet Desteği:** Dokunmatik ekranlar için optimize edilmiş dosya yöneticisi ve kamera entegrasyonu.
- **Adli Bilişim (Forensic SHA-256):** Dosyalar tarayıcıdan çıkmadan Web Crypto ile SHA-256 özeti hesaplanır; Drive dosya açıklamasına ve aktivite günlüğüne yazılır.
- **Uçtan Uca AES-256-GCM (Zero-Knowledge):** İsteğe bağlı açılabilir şifreleme; dosya Google'a gitmeden tarayıcıda PBKDF2 + AES-GCM ile şifrelenir (`.enc`).
- **Anlık Webhook Bildirimleri:** Dosya yüklendiğinde Discord ve Telegram kanallarına asenkron adli bildirim kartı düşer.
- **Panic Wipe:** Acil durumlarda tek tıkla oturumu ve tüm yerel tarayıcı izlerini yok eden acil çıkış butonu.

---

## 🚀 Hızlı Başlangıç (Kurulum Rehberi)

### 1. Adım: Depoyu Hazırlayın
Gerekli bağımlılıkları yükleyin:
```bash
pnpm install
```

### 2. Adım: Google OAuth 2.0 Kimlik Bilgilerini Alın (2 Dakika)
1. [Google Cloud Console](https://console.cloud.google.com) adresine gidin.
2. Ücretsiz bir proje oluşturun ve **"Google Drive API"**yi etkinleştirin.
3. **APIs & Services > Credentials** sayfasına girin.
4. **Create Credentials > OAuth client ID** seçin.
5. Uygulama türü: **Web application**.
6. **Authorized redirect URIs** alanına şunu ekleyin:
   ```text
   http://localhost:3000/oauth2callback
   ```
7. Size verilen `Client ID` ve `Client Secret` değerlerini not edin.

### 3. Adım: Google Drive Refresh Token Üretin
Hazırladığımız tek komutluk yardımcı aracı çalıştırın:
```bash
pnpm run auth:token
```
Terminal sizden Client ID ve Client Secret'ınızı isteyecek, tarayıcıda tek tıkla yetki vermenizi sağlayacak ve `GDRIVE_REFRESH_TOKEN` kodunuzu üretecektir.

### 4. Adım: Ortam Değişkenlerini Tanımlayın (`.env`)
`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri girin:
```bash
cp .env.example .env
```
Örnek `.env`:
```env
ADMIN_PASSWORD=SizinGizliGuvenliParolaniz
JWT_SECRET=Rastgele64KarakterlikBirAnahtar
GDRIVE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GDRIVE_CLIENT_SECRET=GOCSPX-xxxxxxxxx
GDRIVE_REFRESH_TOKEN=1//0xxxxxxxxx
GDRIVE_FOLDER_ID= (Opsiyonel: Boş bırakılırsa ana dizine yükler)
DISCORD_WEBHOOK_URL= (Opsiyonel)
TELEGRAM_BOT_TOKEN= (Opsiyonel)
TELEGRAM_CHAT_ID= (Opsiyonel)
```

---

## 💻 Yerel Geliştirme & Test

Uygulamayı yerel Cloudflare Pages ortamında çalıştırmak için:
```bash
pnpm run dev
```
Varsayılan olarak `http://localhost:8788` adresinde açılacaktır.

Otomatik güvenlik ve şifreleme testlerini çalıştırmak için:
```bash
pnpm test
```

---

## 🌐 Cloudflare Pages'a Canlıya Alma (Deploy)

Projeyi Cloudflare Pages üzerine dağıtmak için:
```bash
pnpm exec wrangler pages deploy public --project-name gdrive-rescue-vault
```

Canlıya aldıktan sonra Cloudflare Dashboard'dan:
1. **Workers & Pages > gdrive-rescue-vault > Settings > Environment variables** bölümüne gidin.
2. `.env` içerisindeki değişkenleri (`ADMIN_PASSWORD`, `JWT_SECRET`, `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`, opsiyonel webhook'lar) ekleyin.
3. Artık sistem 7/24 ücretsiz, global SSL ile canlıda!

---

## 🔓 Şifreli Dosyaları Çözme (Offline Decrypt Tool)

Arayüzde **Zero-Knowledge AES Şifreleme** açıkken yüklenen `.enc` uzantılı dosyaları terminalinizden orijinal haline geri döndürmek için:
```bash
pnpm run decrypt -- --file delil_dosyasi.zip.enc --password Parolaniz
```
Dosya anında çözülerek orijinal formatında kaydedilecektir.
