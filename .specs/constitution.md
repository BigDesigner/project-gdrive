# Project Constitution & Engineering Standards

## 1. Architectural Integrity
- **Stateless Edge Runtime**: Cloudflare Pages Functions must remain completely stateless. Do not rely on persistent in-memory variables across requests.
- **Package Manager Mandate**: Strictly use `pnpm` for all dependency management, scripts, and CI/CD operations.
- **Zero Heavy Build Tooling**: Keep the frontend pure and blazingly fast using native ES modules and CDN-delivered Tailwind/Lucide. No multi-gigabyte node_modules build step for the frontend assets.
- **Modular Functions**: Every API endpoint under `functions/api/` must handle exactly one domain responsibility (`login.js`, `logout.js`, `check-auth.js`, `status.js`, `upload.js`).

---

## 2. Code Quality & Modernity
- **Native Web Crypto**: Never pull in bloated external crypto libraries (such as CryptoJS) when the standard Web Crypto API (`crypto.subtle`) is universally supported across modern browsers and Cloudflare Workers.
- **Strict Error Handling**: Every promise and async network call must be wrapped in `try/catch` with structured JSON error responses: `{ "success": false, "error": "Human readable message" }`.
- **Responsive & Mobile-First**: The UI must adapt seamlessly between desktop drag-and-drop and mobile touch-first file inputs.

---

## 3. Security Standards
- **No Hardcoded Secrets**: Secrets must exclusively come from Cloudflare environment variables or local `.env` files.
- **Safe Response Headers**: Responses must include security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
