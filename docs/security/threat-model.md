# Threat Model
Updated: 2026-07-14

Scope: Voiceify multi-tenant SaaS on a single EC2 Docker host. Assets: org data, conversation transcripts, tool secrets, provider API keys, credit ledger, embed public keys.

## Trust boundaries

1. **Internet → nginx** — public web, widget, `/api`.
2. **nginx → api/web** — Docker network only.
3. **api → Postgres/Redis** — internal; never publish 5432/6379 to `0.0.0.0` in production.
4. **api → ElevenLabs / Groq / Gemini / Stripe** — outbound HTTPS with server-held secrets.
5. **api/worker → tenant HTTP tools** — untrusted third-party URLs (SSRF risk).

## STRIDE summary

| Threat | Example | Mitigations |
|--------|---------|-------------|
| Spoofing | Stolen session cookie | Better Auth HTTP-only cookies, `Secure`+`SameSite` behind TLS, short TTL, logout revoke |
| Tampering | Client forges transcript for free credits | Server-owned STT session; debit after provider usage; never bill from client JSON alone |
| Repudiation | “We never installed that tool” | Audit `tool_invocations`, `credit_ledger`, webhook deliveries |
| Info disclosure | Cross-org agent fetch (IDOR) | Every query filters `org_id` from session/membership; 404 on miss |
| DoS | Mic spam / TTS burn | Redis rate limits per org + IP; credit hard-stop; body size limits |
| Elevation | Member → owner | Role checks in `packages/auth` RBAC; only owner/admin change roles |

## Critical risks

### SSRF via Tools Studio

Tools execute HTTP to tenant-configured URLs. Block:

- Link-local / metadata (`169.254.169.254`, GCP/Azure equivalents)
- Private RFC1918 and localhost unless explicitly enabled for self-hosted demos
- Non-HTTP(S) schemes

Enforce timeouts, max response bytes, and secret redaction in logs.

### Provider key leakage

- Never expose `ELEVENLABS_*`, `GROQ_*`, `GEMINI_*`, Stripe, or `BETTER_AUTH_SECRET` via `VITE_*`.
- Browser gets short-lived Scribe realtime tokens only, minted by API.
- `.env` on EC2: mode `600`, owned by deploy user; not in git.

### Widget abuse

Embed `public_key` + `allowed_origins` on `embed_configs`. Origin check on widget session create. Rate-limit anonymous embed traffic separately from dashboard sessions.

### Stripe webhook forgery

Verify `STRIPE_WEBHOOK_SECRET` signature. Idempotent credit by Stripe event id. Test mode only until ADR updates for live keys.

### Host compromise

Single EC2 blast radius: all tenants. Compensating controls: least-open security group, unattended-upgrades, Docker non-root where possible, encrypted EBS, nightly `pg_dump`, restore drills.

## Secrets inventory (names only)

| Name | Where used |
|------|------------|
| `DATABASE_URL` | api, worker |
| `REDIS_URL` | api, worker |
| `BETTER_AUTH_SECRET` | api |
| `BETTER_AUTH_URL` / `APP_URL` | api, cookies |
| `ELEVENLABS_API_KEY` | api (voice) |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | api (LLM) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | api |
| `VOICEIFY_API_KEY` | optional global API gate |
| Org tool secret refs | encrypted-at-rest goal; v1 at least never returned in list APIs |

## Review cadence

Run [security-review skill](../../) checklist before each phase exit and every deploy. Revisit this file after telephony or live Stripe.
