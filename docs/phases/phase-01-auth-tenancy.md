# Phase 01 — Auth + multi-tenant DB
Updated: 2026-07-14  
Status: not started

## Goal

Real sessions and org-scoped data so every agent, tool, and credit row belongs to a tenant.

## Scope

- Better Auth in `packages/auth` + Hono routes on `apps/api`
- Drizzle schema: `orgs`, `members`, `users`, sessions (see [db/schema.md](../db/schema.md))
- Middleware: session → membership → `org_id`
- Dashboard login/signup wired to API (replace demo `RequireAuth`)
- Seed script for a local demo org

## Exit criteria

- [ ] Sign up, sign in, sign out work behind nginx and in `pnpm dev`
- [ ] Unauthenticated API writes return 401
- [ ] Cross-org reads return 404/403 (no IDOR on agent ids)
- [ ] Migrations apply cleanly on empty Postgres 16

## Non-goals

- SSO/SAML
- SCIM
- Multi-region tenancy
