# ADR 002: Better Auth for authentication

Date: 2026-07-14  
Status: accepted

## Context

The legacy SPA uses a demo `RequireAuth` gate with no real sessions. The rebuild needs email/password (and later OAuth), org membership, HTTP-only cookies usable from the Vite app on the same domain behind nginx, and a schema we control in Postgres.

## Decision

Use **Better Auth** (`packages/auth`) backed by Postgres via our Drizzle schema.

- Session cookies set for `APP_URL` / `BETTER_AUTH_URL`.
- Org (tenant) membership is first-class; API middleware loads `org_id` from the session.
- Server-only secret: `BETTER_AUTH_SECRET`. No auth secrets in `VITE_*`.

## Alternatives

| Option | Why not |
|--------|---------|
| Clerk / Auth0 | External dependency + cost; harder on self-hosted EC2 with air-gapped demos |
| Auth.js (NextAuth) | Tuned for Next.js; we ship Hono + Vite |
| Supabase Auth | Couples auth to Supabase hosting; we own Postgres on EC2 |
| Roll-your-own JWT | Easy to get wrong (rotation, CSRF, session revocation) |

## Consequences

- Auth tables live beside product tables; migrations must ship atomically with Better Auth schema expectations.
- CORS and cookie `SameSite` must match nginx TLS and domain layout (see deployment docs).
- Widget may use short-lived public tokens or org API keys for embed; dashboard uses Better Auth sessions.
- Team must keep Better Auth and Drizzle adapter versions aligned.
