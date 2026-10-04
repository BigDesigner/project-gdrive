# ADR 0003: Client-Side Forensics Hashing and Zero-Knowledge AES-GCM

- **Status**: Accepted
- **Confidence**: Verified
- **Date**: 2026-10-04
- **Supersedes**: None
- **Superseded By**: None

## Context
When performing Incident Response (IR) evidence exfiltration or collecting sensitive breach artifacts, files must maintain chain-of-custody cryptographic integrity. Furthermore, highly confidential artifacts must be protected from third-party storage inspection (Zero-Knowledge).

## Decision
Implement native in-browser Web Crypto API processing before payload transmission:
1. **Forensic Hashing (SHA-256)**: Compute the SHA-256 checksum of every file in the client before upload. Attach this digest to the UI activity log, the Google Drive file `description` metadata, and webhook alerts.
2. **Zero-Knowledge Encryption (AES-256-GCM)**: Provide an optional toggle with a client-supplied passphrase. When enabled, derive a 256-bit key using PBKDF2 (100,000 iterations + 16-byte random salt), encrypt the file payload using AES-GCM with a unique 12-byte IV, and upload as a `.enc` binary package prepending `Salt (16B) + IV (12B)`.
3. Provide an offline Node.js decryption utility (`scripts/decrypt-tool.js`) to reverse the encryption cleanly.

## Consequences
- Preserves forensic non-repudiation and evidence integrity.
- Google cannot inspect encrypted contents even in transit or at rest.

## Evidence
- NIST SP 800-38D (Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode).
- W3C Web Cryptography API Recommendation.
