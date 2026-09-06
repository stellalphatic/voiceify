# Architecture Overview
Updated: 2026-07-14

## System diagram (logical)

```
                    ┌─────────────┐
  Browser / Widget  │  nginx:8080 │
         │          └──────┬──────┘
         │                 │
    /  → web static        │  /api → api:3001 (Hono)
    /widget → widget assets│
                           │
              ┌────────────┴────────────┐
              │         apps/api        │
              │  auth · agents · voice  │
              │  tools · usage · stripe │
              └─────┬──────────┬────────┘
                    │          │
           ┌────────▼──┐  ┌────▼─────┐
           │ Postgres  │  │  Redis   │
           │   :5432   │  │  :6379   │
           └───────────┘  └────┬─────┘
                               │
                        ┌──────▼──────┐
                        │ apps/worker │
                        │ jobs/queues │
                        └──────┬──────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ElevenLabs STT/TTS     Groq Qwen 3.8 27B      Stripe (optional)
   (or Coqui XTTS)        (+ Gemini failover)    Admin credit grants
                          Qdrant (optional)```

Single EC2 host runs all Compose services. External calls leave the host only for model providers and Stripe.

## Packages

| Package | Role |
|---------|------|
| `apps/api` | Hono HTTP API: auth, orgs, agents, voice sessions, tools, billing webhooks |
| `apps/web` | Tenant dashboard + marketing (Vite React) |
| `apps/widget` | Embeddable voice client assets |
| `apps/worker` | Credit reconciliation, TTS cache warm, webhook retries, pack installs |
| `packages/shared` | Types, language helpers, agent prompt rules, API reference shapes |
| `packages/voice` | STT/TTS clients, LLM fan-out, sanitize, pipeline generator |
| `packages/db` | Drizzle schema, migrations, tenant-scoped query helpers |
| `packages/auth` | Better Auth config, session helpers |
| `packages/agents` | Agent config validation, runtime resolution |
| `packages/tools` | Tools Studio registry, HTTP tool runners, allowlists |
| `packages/automations` | Automation Pack definitions + installers |
| `packages/usage` | Credit ledger, metering, soft/hard limits |
| `packages/ui` | Shared React primitives for web/widget |
| `packages/config` | Shared ESLint/TS/env helpers |

## Voice data flow (one turn)

1. **Capture** — Widget streams mic PCM (or sends utterance blob) to the API / opens a realtime STT channel.
2. **STT** — ElevenLabs Scribe (batch or realtime token) produces text + optional language hint. Server never trusts client-supplied transcripts for billing without a session id.
3. **Orchestrate** — `packages/voice` loads agent runtime (system prompt, voice id, tool allowlist, language mode) scoped to `org_id`.
4. **LLM** — Groq generates the reply (Gemini failover). If the model emits tool calls:
   - `packages/tools` validates against the org allowlist.
   - Worker or inline runner executes HTTP tools with timeouts + redacted logs.
   - Results return to the LLM for a final spoken response.
5. **Sanitize** — Strip unsafe content and length-cap for TTS ([voice-sanitize](../../packages/voice/src/voice-sanitize.ts)).
6. **TTS** — ElevenLabs Flash streams PCM by default, or Coqui XTTS when `TTS_PROVIDER=coqui`.
7. **Meter** — Debit credits (STT seconds + LLM tokens + TTS chars) via `packages/usage`; Redis holds soft rate limits.

```
mic → STT → [tools loop] → LLM text → sanitize → TTS PCM → speaker
                 ↑_______________|
```

Target: first audio byte under ~500ms when Groq + Flash are healthy and tools are not required.

## Multi-tenancy

- Every tenant row carries `org_id`. API middleware resolves session → membership → `org_id`.
- Agents, tools, packs, uploads, and credit wallets are org-scoped.
- Redis keys prefix with `org:{id}:…` for rate limits and session locks.

## Trust boundaries

| Boundary | Rule |
|----------|------|
| Browser → nginx | Public widget/marketing; auth cookies on dashboard |
| nginx → api | Internal Docker network; `/api` only |
| api → providers | Server-held API keys; no key forwarding to clients |
| api → tools | Egress allowlist + timeouts; no SSRF to metadata IPs |
| webhook (Stripe) | Signature verification; idempotent ledger writes |

See [security/threat-model.md](../security/threat-model.md).

## Related docs

- Product report / PRD: [../PROJECT_REPORT.md](../PROJECT_REPORT.md)
- Open-source stack: [../integrations/open-source-stack.md](../integrations/open-source-stack.md)
- ADRs: [architecture/decisions/](./decisions/)
- Schema: [db/schema.md](../db/schema.md)
- ElevenLabs: [integrations/elevenlabs.md](../integrations/elevenlabs.md)
- Deploy: [deployment/ec2.md](../deployment/ec2.md)
