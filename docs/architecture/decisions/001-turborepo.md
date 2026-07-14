# ADR 001: Turborepo + pnpm workspaces

Date: 2026-07-14  
Status: accepted

## Context

Voiceify is moving from a single Vite/Express tree to a multi-app SaaS (API, web dashboard, embeddable widget, background worker) with shared voice, auth, and DB libraries. We need fast incremental builds, clear package boundaries, and one lockfile for Docker and CI.

## Decision

Use **pnpm workspaces** with **Turborepo** at the repo root.

- Apps live under `apps/*`; libraries under `packages/*`.
- Root scripts (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck`) delegate to Turbo.
- Docker multi-stage builds filter by app package and rely on `pnpm fetch` / workspace install.

## Alternatives

| Option | Why not |
|--------|---------|
| Keep monolith (`src/` + `server.ts` only) | Cannot share types cleanly between API, widget, and worker; harder to containerize separately |
| npm/yarn workspaces without Turbo | Workspaces alone lack task graph caching; CI times grow fast |
| Nx | Heavier config surface for a small team; Turbo is enough for our graph |
| Separate repos per app | Slow coordination on voice pipeline types; worse for EC2 single-host deploy |

## Consequences

- New code belongs in `apps/` or `packages/`; legacy `src/`/`server/`/`api/` migrate phase by phase.
- Package `name` fields must be stable (`@voiceify/*`) for Docker and Turbo filters.
- Contributors run `pnpm install` once at root; never nest a second package manager.
- Turbo `dependsOn: ["^build"]` means library builds must emit consumable `dist/` (or be TypeScript project-referenced carefully).
