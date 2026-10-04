# System Boundary Conditions & Security Contract

## 1. Authentication & Session Boundaries [Verified]
- **Single-Admin Model**: Authentication strictly verifies against `ADMIN_PASSWORD`.
- **Timing-Attack Immunity**: Parola doğrulamalarında `crypto.subtle.timingSafeEqual` kullanılmalıdır. Standart `===` veya `strcmp` dizgi karşılaştırmaları kesinlikle yasaktır.
- **Session Tokens**: Oturumlar Web Crypto HMAC-SHA256 ile imzalanmalı, istemciye yalnızca `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400` nitelikli çerez ile verilmelidir.
- **Panic Wipe (Emergency Purge)**: Acil çıkış durumunda tarayıcı yerel depolaması (`localStorage`/`sessionStorage`), DOM geçmişi ve oturum çerezi (`Max-Age=0`) sıfırlanmalıdır.

---

## 2. Ingestion & File Upload Boundaries [Verified]
- **Payload Size Enforcement**: Cloudflare Free Worker/Pages Functions limitine uygun olarak tek seferde maksimum 100 MB istek gövdesi işlenir. 100 MB üzeri istekler 413 Payload Too Large ile reddedilir.
- **Zero Raw File Execution**: Sunucu tarafında (Pages Functions) yüklenen dosyalar asla `eval`, dinamik import veya shell execution işlemine tabi tutulmaz; yalnızca doğrudan Google Drive API'ye stream edilir.
- **Client-Side SHA-256 Forensics**: Dosya tarayıcıdan çıkmadan önce SHA-256 hash'i hesaplanmalı ve adli delil bütünlüğü için Drive metadata'sına (`description`) ve webhook özetine yazılmalıdır.
- **Zero-Knowledge Encryption Contract**:
  - Şifreleme aktifken PBKDF2 (100,000 iterasyon, SHA-256, 16-byte kriptografik rastgele salt) ve AES-256-GCM (12-byte kriptografik rastgele IV) kullanılmalıdır.
  - Şifrelenmiş çıktı `[Salt (16B)][IV (12B)][Ciphertext + Auth Tag]` formatında paketlenmelidir.

---

## 3. Webhook Alert Boundaries [Verified]
- **Egress Cooldown & Non-Blocking**: Discord ve Telegram webhook çağrıları dosya yükleme yanıtını bloke etmemeli, asenkron (`ctx.waitUntil` veya arka plan `fetch`) yürütülmelidir.
- **Credential Masking**: Webhook mesajlarında, loglarda veya hata çıktılarında Google Client Secret, Refresh Token veya Admin parolası asla açık edilmemelidir.

---

## 4. DOM Security & UI Invariants [Verified]
- **Anti-String-DOM & DOM-XSS Guard**: İstemci tarafında kullanıcı veya dosya girdileri (dosya adı, dosya boyutu, hata mesajları) doğrudan `innerHTML` sink'lerine dizgi olarak eklenemez. DOM elemanları güvenli şekilde (`textContent` veya DOM API'leri ile) oluşturulmalıdır.
