# ADR 0001: Initial Technical Stack and Platform Selection

- **Status**: Accepted
- **Confidence**: Verified
- **Date**: 2026-10-04
- **Supersedes**: None
- **Superseded By**: None

## Context
The project requires an incident response (Blue Team / Rescue) secure file staging vault that operates under a strictly **100% Always Free** paradigm with zero server maintenance overhead. It must run on any browser or mobile device, support drag-and-drop auto-upload, single-admin credentialed access, and direct exfiltration to cloud storage.

## Decision
Adopt **Cloudflare Pages Full-Stack** architecture:
1. **Frontend**: Static single-page application (Vanilla HTML5 / Modern ES Modules / Tailwind CSS CDN / Lucide Icons). No bloated client framework or heavy build steps to maximize execution speed, stability, and mobile compatibility.
2. **Backend**: Cloudflare Pages Functions (`/functions/api/*`) running on Cloudflare's serverless V8 edge runtime.
3. **Execution Environment**: 100% Always Free tier (unlimited static requests, 100,000 free function invocations/day, automatic global SSL, DDoS mitigation).

## Consequences
- Single upload body payload is capped at 100 MB per request (Cloudflare Worker free limit), which is optimal for incident response scripts, triage dumps, configs, and memory slices.
- Zero server maintenance, zero cold-start delay, zero infrastructure cost.

## Evidence
- Cloudflare Pages documentation on Functions and request limits.
- Project requirements specified in implementation planning.
