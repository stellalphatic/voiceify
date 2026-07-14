# Database Schema Summary
Updated: 2026-07-14

Source of truth: Drizzle schemas in `packages/db/src/schema/`. Migrations via `pnpm db:generate` / `pnpm db:migrate`.

Multi-tenancy rule: every product row that belongs to a customer carries `org_id` → `organizations.id`. Auth tables (`user`, `session`, `account`, `verification`) are global; membership links users to orgs.

## Entity groups

### Auth (Better Auth)

| Table | Purpose |
|-------|---------|
| `user` | Identity (email, name, verified) |
| `session` | Cookie sessions (`token`, `expiresAt`, `userId`) |
| `account` | Provider credentials / password hash |
| `verification` | Email verify / reset tokens |

### Tenancy & billing shell

| Table | Purpose |
|-------|---------|
| `plans` | Credit quotas, max agents/minutes, price |
| `organizations` | Tenant; `slug`, `plan_id`, `credit_balance_cents` |
| `org_members` | `org_id` + `user_id` + role (`owner` / `admin` / `member`) |
| `api_keys` | Hashed keys for embed/API (`key_hash`, `key_prefix`, scopes) |
| `subscriptions` | Stripe test subscription linkage + status |

### Agents & Packs

| Table | Purpose |
|-------|---------|
| `agents` | Org agent config (status, voice, language, soft-delete) |
| `agent_versions` | Immutable prompt/voice/tool/knowledge snapshots |
| `tools` | Tools Studio defs (`http` / `builtin` / `pack`) |
| `automation_installs` | Installed Pack ids (`restaurant`, `receptionist`, `appointments`) |

### Conversations

| Table | Purpose |
|-------|---------|
| `conversations` | Session (agent, channel: sandbox/embed/api, latency/cost) |
| `messages` | Turn transcript (`user` / `assistant` / `system` / `tool`) |
| `tool_invocations` | Per-call args/result/status/duration |

### Knowledge

| Table | Purpose |
|-------|---------|
| `knowledge_docs` | Uploaded docs + processing status |
| `knowledge_chunks` | Chunked text for retrieval (`tsv` for FTS) |

### Usage & credits

| Table | Purpose |
|-------|---------|
| `usage_events` | Append-only meter (`stt_ms`, `llm_tokens`, `tts_chars`, `tool_call`) |
| `usage_daily` | Rollup per org/day |
| `credit_ledger` | Wallet deltas (`delta_cents`, `balance_after`, ref) |

### Outbound & embed

| Table | Purpose |
|-------|---------|
| `webhooks` | Org HTTPS endpoints + signing secret |
| `webhook_deliveries` | Retryable delivery log |
| `embed_configs` | Public key, allowed origins, theme |
| `simulation_scenarios` | Dashboard sandbox scripts |

### Automation Pack domain tables

Pack-specific data stays org-scoped so installs do not leak across tenants.

| Pack | Tables (examples) |
|------|-------------------|
| Restaurant | `menu_items`, reservations, orders |
| Receptionist | `departments`, `faq_entries`, intake tickets |
| Appointments | `services`, staff/availability, `appointments` |

## Indexing notes

- Always index `(org_id)` on tenant tables; compound indexes for common filters (`org_id`, `status`, `started_at`).
- Unique: org slug, member (`org_id`, `user_id`), agent version (`agent_id`, `version`), API key hash, embed public key, usage daily (`org_id`, `day`).
- Soft-delete agents via `deleted_at`; hard-delete org cascades members, keys, agents when intentional.

## Migrations

```bash
pnpm db:generate   # drizzle-kit from packages/db
pnpm db:migrate    # apply against DATABASE_URL
```

Empty Postgres 16 required for first migrate; seed a demo org after Phase 01 auth lands.

## Related

- ADR 002 (Better Auth), ADR 005 (credit wallet)
- [security/threat-model.md](../security/threat-model.md) for IDOR / tenancy checks
