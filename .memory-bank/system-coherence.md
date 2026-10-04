# System Coherence & Operational Governance

## 1. Operational Overview
- **Project Name**: GDrive Rescue Vault (Incident Response & Blue Team File Staging)
- **Primary Paradigm**: Cloudflare Pages Full-Stack Web Application (Serverless V8 Edge Runtime + Static Single-Page Application)
- **Target Storage**: Google Drive v3 REST API (Personal 15 GB Free Quota via OAuth 2.0 User Credentials)
- **Deployment Strategy**: Cloudflare Pages Git / Direct Deployment (`wrangler pages deploy`)

---

## 2. Session Start Protocol
1. Verify presence of `.memory-bank/active-session.json`.
2. Inspect lock state: check for `.memory-bank/.session.lock`. If older than 10 minutes, clear stale lock. Otherwise, respect lock.
3. Check `.tasks/pipeline.md` for active tasks and sprint focus.
4. Verify worktree cleanliness and environment status before modifying project files.

---

## 3. Context Drift & Quality Guards
- **Zero Source Disruption During Auditing**: Sentinel skills only modify specification and planning artifacts, never modifying production application code without explicit execution clearance.
- **Traceable ADR Lineage**: Any change in architecture, auth mechanism, or storage strategy must be registered under `.memory-bank/adr/` with bi-directional lineage linking (`Supersedes` / `Superseded By`).
- **Cryptographic Grounding**: Client-side cryptographic operations (SHA-256 evidence hashing, AES-256-GCM zero-knowledge encryption) must use standard Web Crypto API primitives without custom or weakened implementations.

---

## 4. Pre-Change & Post-Change Checklist
### Pre-Change
- [ ] Verify target files exist or are documented in `.tasks/pipeline.md`.
- [ ] Ensure boundary conditions in `.specs/boundary-conditions.md` are not violated.
- [ ] Confirm no secret keys or sensitive tokens are hardcoded.

### Post-Change
- [ ] Run syntax/type/integrity checks (`pnpm test` or `pnpm run dev`).
- [ ] Verify error boundary and edge handling.
- [ ] Update `.memory-bank/changelog/verified-worklog.md`.
- [ ] Update `.tasks/pipeline.md` and `.tasks/handoff.md`.

---

## 5. Security & Edge Guardrails
- **Timing-Safe Auth**: Admin authentication on Cloudflare Pages Functions must use constant-time comparison (`crypto.subtle.timingSafeEqual`) to mitigate side-channel timing attacks.
- **Secure Cookie Policy**: Authentication session tokens must be stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- **Payload Limits**: Enforce maximum single-upload limit of 100 MB adhering to Cloudflare Pages Workers free tier envelope.
