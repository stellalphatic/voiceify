# Voiceify

Voice AI agents for support, sales, and operations — multi-tenant SaaS with Tools, Automation Packs, usage metering, and a web embed.

> Sub-500ms voice stack (ElevenLabs STT/TTS + Groq/Gemini). Deploy on a single EC2 with Docker Compose.

## Monorepo

```
apps/api web widget worker
packages/db auth voice shared agents tools automations usage ui config
docs/
docker-compose.yml
```

Live context for humans and agents: [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md).

## Quick start

**Prerequisites:** Node ≥ 20, pnpm 9, Docker (Postgres + Redis).

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET (openssl rand -base64 32)
# Set ELEVENLABS_API_KEY, GROQ_API_KEY, GEMINI_API_KEY

docker compose up -d postgres redis
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:seed:admin   # platform super-admin (see .env.example)
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/health  
- OpenAPI: http://localhost:3001/api/openapi.json  
- Admin portal: http://localhost:5173/admin (super-admin only)

Full stack (including nginx on :8080):

```bash
pnpm docker:up
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Turbo: api + web + worker |
| `pnpm build` | Build all packages/apps |
| `pnpm test` | Vitest across workspace |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:seed` | Seed Free/Pro/Enterprise plans |
| `pnpm db:seed:admin` | Upsert platform super-admin user |
| `pnpm docker:up` | Compose build + start |

## Deployment

**Full go-live (API keys, EC2 size, DNS, TLS for voiceify.online):**
[docs/deployment/GO_LIVE.md](docs/deployment/GO_LIVE.md)

Quick EC2 notes: [docs/deployment/ec2.md](docs/deployment/ec2.md)

Stripe is **optional** (`STRIPE_ENABLED=false`). Credits work via `/admin` or dashboard Settings demo top-up.

## Security

- Better Auth sessions on the API; dashboard routes gated client + server
- No `VITE_*` secrets
- Org-scoped data (`org_id` on tenant tables)
- Per-org API keys (hashed)
- Redis rate limits on voice/embed

## License

Proprietary — © Voiceify, all rights reserved.
