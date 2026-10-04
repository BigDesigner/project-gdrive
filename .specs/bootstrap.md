# System Bootstrap & Operations Specification

## 1. Prerequisites [Verified]
- Node.js >= 18.0.0 (Environment has Node v24.14.0)
- pnpm >= 9.0.0 (Environment has pnpm 11.12.0)
- Cloudflare Wrangler CLI (`wrangler` >= 3.0.0, available via `pnpm exec wrangler`)
- Google Cloud Console Account (Free tier) with Google Drive API enabled

---

## 2. Environment Configuration [Verified]
The application requires the following environment variables (stored in `.env` for local testing, and Cloudflare Pages dashboard variables for production):

```env
# Administrative Security
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_64_character_hmac_secret

# Google Drive API (OAuth 2.0)
GDRIVE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GDRIVE_CLIENT_SECRET=GOCSPX-your_client_secret
GDRIVE_REFRESH_TOKEN=1//your_refresh_token
GDRIVE_FOLDER_ID=your_optional_folder_id

# Webhook Alerting (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
```

---

## 3. Development Commands [Verified]
- **Install Dependencies**:
  ```bash
  pnpm install
  ```
- **Start Local Pages Functions Server**:
  ```bash
  pnpm run dev
  ```
- **Fetch Google OAuth Refresh Token**:
  ```bash
  pnpm run auth:token
  ```
- **Decrypt Artifact Offline**:
  ```bash
  pnpm run decrypt -- --file <encrypted_file.enc> --password <passphrase>
  ```
- **Execute Integrity Verification Tests**:
  ```bash
  pnpm test
  ```

---

## 4. Deployment [Verified]
- **Target**: Cloudflare Pages (`wrangler pages deploy public`)
- **Compatibility Date**: `2024-09-01`
- **Output Directory**: `public`
