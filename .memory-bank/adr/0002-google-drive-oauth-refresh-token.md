# ADR 0002: Google Drive API Authentication via OAuth 2.0 Refresh Token

- **Status**: Accepted
- **Confidence**: Verified
- **Date**: 2026-10-04
- **Supersedes**: None
- **Superseded By**: None

## Context
Standard Google Cloud Service Accounts have 0 bytes of storage quota on personal (free @gmail.com) Google accounts. When uploading to shared personal folders via a Service Account, Google Drive API rejects uploads with `storageQuotaExceeded` because personal accounts do not delegate domain-wide storage to external identities.

## Decision
Use an **OAuth 2.0 Web/Desktop Client ID + Refresh Token** flow for personal Google Drive accounts:
1. Provide a one-time interactive CLI utility (`scripts/get-refresh-token.js`) to authenticate the administrator's personal Google account once and capture a long-lived `refresh_token`.
2. Cloudflare Pages Function dynamically exchanges the `refresh_token` for a short-lived `access_token` on demand to stream file uploads directly into the user's personal 15 GB quota.

## Consequences
- 100% of the user's free 15 GB Google Drive storage is fully accessible without storage quota errors.
- No recurring subscription or Google Workspace paid licensing required.

## Evidence
- Google Drive API v3 documentation on OAuth 2.0 token expiration and storage quota policies.
