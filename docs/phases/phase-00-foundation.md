# Phase 00 — Foundation
Updated: 2026-07-14  
Status: in progress

## Goal

Stand up the monorepo, shared packages, documentation system, and Docker Compose skeleton so later phases have a stable spine.

## Scope

- Turborepo + pnpm workspaces (`apps/*`, `packages/*`)
- Root scripts: `dev`, `build`, `test`, `typecheck`, `lint`
- Extract voice/shared libraries into `packages/voice`, `packages/shared`
- Docs under `docs/` (WALKTHROUGH, ADRs, phases)
- `docker-compose.yml`, Dockerfiles, nginx, `.env.example`, backup script

## Exit criteria

- [ ] `pnpm install` succeeds at root
- [ ] `docker compose config` validates
- [ ] WALKTHROUGH points at this phase
- [ ] No secrets committed; `.env.example` lists required vars
- [ ] Legacy app still runnable during migration (non-blocking)

## Non-goals

- Production auth, billing, or Packs
- Deleting the legacy `src/` tree
