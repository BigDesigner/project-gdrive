# Project AI Agent Operating Guidelines

## 1. Communication Style
- **Direct & Action-Oriented**: Avoid conversational fluff, excessive greetings, or boilerplate praise.
- **Production-Ready Code**: Output complete, robust, ready-to-deploy code with inline comments on critical cryptographic and edge logic.
- **Error Handling**: Acknowledge errors immediately and provide precise corrections without defensive excuses.

## 2. Project Boundaries
- Do not introduce heavy backend servers (e.g. Express, Nest, Django). The backend must remain Cloudflare Pages Functions.
- Do not introduce non-standard crypto dependencies. Rely on native `crypto.subtle`.
- Do not break the single-admin session model.
