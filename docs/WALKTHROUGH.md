# Voiceify Walkthrough
Updated: 2026-09-06

## What this is

Voiceify is a multi-tenant voice AI SaaS for support, sales, and operations. Tenants build voice agents, attach tools and Automation Packs, and embed a web widget. Deployment target: single AWS EC2 host running Docker Compose. Full product report: [PROJECT_REPORT.md](./PROJECT_REPORT.md).

## Current phase

**Phases 0–7 implemented** plus hybrid open-source backend hooks (Qwen 3.8, Coqui XTTS, Qdrant). See [docs/roadmap.md](./roadmap.md).

| Phase | Name | Status |
|-------|------|--------|
| 00 | Foundation | Done |
| 01 | Auth + multi-tenant DB | Done |
| 02 | Agents + versions + deploy | Done |
| 03 | Usage + credits + API keys | Done |
| 04 | Tools + webhooks | Done |
| 05 | Automation Packs | Done |
| 06 | Knowledge + analytics + simulations | Done |
| 07 | Embed + Redis limits + OpenAPI + EC2 | Done |

## Architecture at a glance

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm |
| API | Hono (`apps/api`) |
| Web | Vite + React (`apps/web`) |
| Widget | Embed bootstrap (`apps/widget`) |
| Worker | BullMQ (`apps/worker`) |
| DB | Postgres 16 + Drizzle (`packages/db`) |
| Auth | Better Auth (`packages/auth`) |
| Voice | Qwen 3.8 27B (Groq) + optional Gemini failover + ElevenLabs STT/TTS; optional Coqui XTTS + Qdrant |

## Active TODOs

1. Run `pnpm db:generate && pnpm db:migrate && pnpm db:seed` against local Postgres.
2. End-to-end demo on EC2 with real provider keys.
3. Optional: `docker compose --profile vectors up -d qdrant` for vector RAG.
4. Optional: Playwright smoke tests.

## Recently completed

- 2026-07-14: Full API surface (orgs, agents, tools, packs, usage, knowledge, embed, voice turn)
- 2026-07-14: Better Auth wired into web AuthPage / RequireAuth
- 2026-07-14: Automation Pack executors writing to Postgres
- 2026-07-14: Docker Compose + EC2 docs

## Known issues / gotchas

- Dashboard still contains a large legacy layout; server agents sync via `AgentStoreContext.refreshFromApi`.
- Stripe top-up uses test-mode grant path (no live charges).
- Telephony is explicitly out of v1.

## Decisions in force

- [001](./architecture/decisions/001-turborepo.md) Turborepo
- [002](./architecture/decisions/002-better-auth.md) Better Auth
- [003](./architecture/decisions/003-custom-voice-pipeline.md) Custom pipeline
- [004](./architecture/decisions/004-no-telephony-v1.md) No phone in v1
- [005](./architecture/decisions/005-credit-wallet-stripe-test.md) Credit wallet
- [006](./architecture/decisions/006-automation-packs-moat.md) Automation Packs

## How to run

```bash
cp .env.example .env
# set BETTER_AUTH_SECRET, DATABASE_URL, REDIS_URL, AI keys

docker compose up -d postgres redis
pnpm install
# DATABASE_URL=postgresql://voiceify:voiceify@localhost:5433/voiceify
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/health
- OpenAPI: http://localhost:3001/api/openapi.json
- Postgres (compose): localhost:5433
