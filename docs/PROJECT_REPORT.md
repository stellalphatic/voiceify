# Project Report — Voiceify

**A Multi-Tenant Voice AI Platform for Real-Time Conversational Agents**

---

## Abstract

Voiceify is a production-oriented, multi-tenant Software-as-a-Service
platform for building, configuring, testing, and deploying low-latency
voice agents. Tenants create agents in a dashboard, ground them with a
knowledge base, connect HTTP tools and automation packs, enforce
guardrails, meter usage through a credit wallet, and expose agents via
API keys and website embeds.

Unlike a thin wrapper around a single speech vendor, Voiceify owns the
orchestration layer: speech-to-text, open-weight large language models,
text-to-speech, tool calling, knowledge retrieval, tenancy, billing
primitives, and an operator console. The default live path uses
ElevenLabs Scribe and Flash for low-latency speech, Groq-hosted **Qwen
3.8 27B** (open weights) for replies with optional Google Gemini failover,
and Postgres for the system of record. Optional open-source backends —
**Coqui XTTS** for self-hosted TTS and **Qdrant** for tenant-scoped
vector search — plug in through configuration so teams can reduce
vendor lock-in without rewriting the product.

This report describes the problem, requirements, architecture, detailed
design, security and compliance posture, deployment model, evaluation
criteria, limitations, and a forward roadmap that includes telephony,
deeper compliance, and enterprise controls.

---

## Table of Contents

1. Introduction
2. Background and Motivation
3. Related Work
4. Requirements Analysis
5. System Architecture
6. Detailed Design
7. Database Design
8. Implementation
9. Hybrid AI Stack (Commercial + Open Source)
10. Security and Compliance
11. User Experience and Design System
12. Deployment and DevOps
13. Observability and Operations
14. Testing and Quality Assurance
15. Results and Evaluation
16. Limitations
17. Future Work
18. Conclusion
19. References
20. Appendices

---

## 1. Introduction

### 1.1 Product name

**Voiceify** (`voiceify.online`).

### 1.2 Purpose

To give product teams and operators a complete voice-agent workspace:
create agents, attach knowledge and tools, test them in a microphone
sandbox, meter spend, and ship them to websites and backends — without
outsourcing the entire stack to a black-box conversational-AI vendor.

### 1.3 Scope of this report

This report covers Voiceify as a shipping multi-tenant SaaS:

- Functional and non-functional requirements.
- Monorepo architecture (Turborepo + pnpm) and the voice turn pipeline.
- Tenancy, credits, knowledge, tools, automation packs, and admin.
- Hybrid model strategy (Qwen 3.8, Coqui XTTS, Qdrant, ElevenLabs, optional Gemini).
- Security, privacy export, and compliance roadmap.
- Docker Compose deployment on a single EC2 host with TLS.
- Honest limitations and next-phase work.

### 1.4 Document structure

The report moves from problem and market context into architecture,
subsystem design, operations, evaluation, and future work.

---

## 2. Background and Motivation

### 2.1 Voice as a product surface

Customers increasingly expect to talk to software the way they talk to
people: order food, book appointments, answer FAQs, qualify leads.
Phone IVRs are brittle; chatbots ignore spoken nuance; building a
production voice pipeline in-house means stitching STT, LLM, TTS,
tools, auth, and billing — then operating it under latency and cost
constraints.

### 2.2 The wrapper trap

Many “voice AI” products are thin UIs over a single provider’s agent
API. That creates three problems:

1. **Lock-in** — swapping STT/TTS or moving inference on-prem is hard.
2. **Opaque cost** — operators cannot see where credits burn (STT vs
   LLM vs TTS vs tools).
3. **Weak tenancy** — multi-workspace SaaS concerns (RBAC, ledgers,
   knowledge isolation) arrive late.

Voiceify’s bet is the opposite: own orchestration, tenancy, and
product UX; treat speech and LLM providers as swappable backends.

### 2.3 Why open weights and optional self-hosting matter

Using **Qwen 3.8 27B** via Groq for generation, with optional **Coqui
XTTS** for speech synthesis and **Qdrant** for vectors, lets Voiceify
position as a platform:

- Demonstrate capability beyond a single commercial TTS brand.
- Offer a path toward lower unit cost and data residency.
- Keep a commercial low-latency path (ElevenLabs Flash / Scribe) for
  demos and production SLAs today.

---

## 3. Related Work

| System | Strengths | How Voiceify differs |
|---|---|---|
| ElevenLabs Agents / Conversational AI | Excellent speech quality, managed agents | Voiceify uses EL for STT/TTS components only; owns agents, tools, tenancy, credits, and packs (ADR 003). |
| Retell / Vapi | Strong telephony + voice DX | Telephony is deferred (ADR 004); Voiceify ships dashboard-first SaaS with packs and credits on self-hosted Compose. |
| Bland / Synthflow | Phone automation focus | Voiceify targets embed + API + sandbox first; packs encode vertical logic in Postgres. |
| Custom n8n + Whisper + TTS | Cheap experiments | No multi-tenant isolation, metering, or operator UX. |
| ChatGPT Voice / consumer assistants | Great UX | Not a white-label multi-tenant B2B platform. |

Voiceify’s wedge: **custom STT→LLM→TTS pipeline + multi-tenant
workspace + Automation Packs + hybrid open-source backends**.

---

## 4. Requirements Analysis

### 4.1 Stakeholders

| Stakeholder | Interest |
|---|---|
| Tenant operator | Create agents fast; trust answers; control spend. |
| Developer | API keys, OpenAPI, embeds, tool webhooks. |
| End caller | Low latency, multilingual, clear handoff when stuck. |
| Platform admin | Approve signups, grant credits, inspect usage. |
| Security / compliance reviewer | Tenancy isolation, secrets handling, export/erasure path. |
| Buyer evaluating Voiceify | Proof of architecture depth, not only a demo mic button. |

### 4.2 Functional requirements (summary)

1. Email/password auth with optional signup approval and platform admin.
2. Organizations, memberships, and role-scoped API access.
3. Agent CRUD, versioning, deploy, voices, languages (including multilingual).
4. Sandbox microphone testing with no auto-start until user consent.
5. Knowledge ingest (text, PDF, DOCX) with chunking, embeddings, retrieval.
6. Tools Studio: HTTP tools, configure URLs/headers, test invocations.
7. Automation Packs (restaurant, receptionist, appointments).
8. Workflow canvas for conversation graph design (workspace-persisted).
9. Guardrails persisted to agent config and injected into live turns.
10. Conversations, transcripts, analytics rollups.
11. Credit wallet with ledger; usage debit on voice turns.
12. Org API keys (`vfk_…`) and embed tokens (`vw_…`).
13. Public docs + OpenAPI; privacy data export endpoint.
14. Health reporting for commercial and open-source backends.

### 4.3 Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Time-to-first-audio (healthy path, no tools) | ≤ 500 ms typical |
| NFR-02 | Cross-tenant isolation | 100% of product queries scoped by `org_id` |
| NFR-03 | Provider secrets | Server-only; never `VITE_*` |
| NFR-04 | Tool egress | URL allowlist + timeouts (SSRF-safe) |
| NFR-05 | Rate limiting | Redis-backed, fail-open with logs |
| NFR-06 | Availability (single host) | Compose healthchecks; TLS via Caddy |
| NFR-07 | Accessibility baseline | Keyboardable dashboard, labeled controls |
| NFR-08 | Multilingual | EN / UR / auto + expandable language modes |
| NFR-09 | Portability | Privacy JSON export for workspace data |

### 4.4 Representative user stories

- As an operator, I want to install a restaurant pack and talk to it
  in Sandbox within minutes.
- As a developer, I want a `vfk_` key and OpenAPI so my backend can
  call agent turns without browser sessions.
- As a compliance-minded buyer, I want a data export and a clear
  story for retention and erasure.
- As a platform admin, I want to approve tenants and grant credits
  without touching the database.

### 4.5 Constraints

- Single-host Docker Compose for v1 (not multi-region HA).
- No PSTN/SIP in v1 (ADR 004).
- Stripe live checkout optional; credits work via admin/demo paths.
- Open-source TTS/vector paths require operators to run Coqui/Qdrant.

---

## 5. System Architecture

### 5.1 High-level architecture

```
  Browser / Widget                Edge
       │                     ┌────────────┐
       ├─ static web ───────►│ nginx/Caddy│
       └─ /api/* ───────────►└─────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │  apps/api   │  Hono
                            │ auth agents │
                            │ voice tools │
                            │ knowledge   │
                            │ usage admin │
                            └──────┬──────┘
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
           Postgres 16          Redis 7         Providers
           (system of           (limits,        Groq Qwen 3.8
            record)              queues)        Gemini failover
                                                ElevenLabs STT/TTS
                                                Coqui XTTS (opt)
                                                Qdrant (opt)
                            ┌──────▼──────┐
                            │ apps/worker │
                            │ webhooks    │
                            └─────────────┘
```

### 5.2 Architectural style

Voiceify is a **modular monorepo** (Turborepo + pnpm workspaces) with
clear package boundaries rather than a microservice mesh. Deployable
units on EC2:

| Unit | Role |
|---|---|
| `apps/api` | HTTP API |
| `apps/web` | Marketing + tenant dashboard + docs |
| `apps/worker` | Async jobs (webhooks, rollups) |
| `apps/widget` | Embed bootstrap assets |
| `postgres` / `redis` | Data + coordination |
| `qdrant` (profile `vectors`) | Optional vector store |

### 5.3 Tenancy model

Every business is an `organization`. Product rows carry `org_id`.
API middleware resolves session (or org API key) → membership → org.
Qdrant collections are named per organization when vectors are enabled
(`voiceify_kb_{orgId}`), so retrieval stays tenant-scoped even if a
query bug occurred at the SQL layer.

### 5.4 Trust boundaries

| Boundary | Rule |
|---|---|
| Browser → edge | Public marketing/docs; auth cookies for dashboard |
| Edge → API | Internal Docker network |
| API → providers | Server-held keys only |
| API → HTTP tools | Parsed definitions, timeouts, SSRF guards |
| Stripe webhooks (future) | Signature verification + idempotent ledger |

---

## 6. Detailed Design

### 6.1 Voice turn pipeline

Authenticated path: `POST /api/voice/:orgId/agents/:agentId/turn`

1. Credit gate (`assertOrgHasCredits`).
2. Load agent + deployed version.
3. Persist user message; optionally create conversation.
4. Retrieve knowledge (Qdrant if configured, else Postgres hybrid).
5. Inject tool hints and **guardrails** from `agents.guardrails`.
6. Run LLM (Groq Qwen 3.8 / fast profile / optional Gemini fallback).
7. Execute model-selected, tenant-scoped pack/HTTP tools with confirmation gates.
8. Sanitize reply text; synthesize speech (ElevenLabs or Coqui).
9. Stream NDJSON events; debit credits (STT/LLM/TTS/tools).

Sandbox and demo surfaces share `packages/voice` runtime helpers so
behavior stays consistent.

### 6.2 Knowledge and RAG

- Ingest: paste text or upload PDF/DOCX (`pdf-parse`, `mammoth`).
- Chunk (~800 chars), store in `knowledge_chunks`.
- Local bag-of-hash embeddings stored alongside chunks.
- Optional mirror into **Qdrant**; original upload discarded after
  extraction.
- Search modes: `qdrant` | `hybrid` | `keyword`.

### 6.3 Tools and Automation Packs

- Tools Studio installs HTTP tools with configurable method, URL,
  headers, and body templates.
- Pack tools (`type=pack`) encode vertical flows (reservations,
  appointments, intake) with Postgres-backed executors.
- Webhooks support signed delivery tests and worker retries.

### 6.4 Workflows UI

The workflows page provides an n8n-inspired canvas (drag nodes,
connect ports, persist graph per workspace) plus pack install.
Runtime execution remains LLM + tools + packs (graph execution engine
is a roadmap item).

### 6.5 Guardrails

Dashboard policies sync to `agents.guardrails` JSONB and are injected
into the live turn prompt (PII caution, topic bounds, jailbreak
refusal, language allow-list, blocked topics, tool limits).

### 6.6 Credits and usage

- Org wallet: `organizations.creditBalanceCents`.
- Immutable-ish ledger: `credit_ledger`.
- Voice turns call `recordUsageAndDebit`.
- Platform admin grants credits; optional demo top-up; Stripe schema
  ready for live checkout.

### 6.7 Embeds and API keys

- `vfk_` secrets for server-to-server turns.
- `vw_` public embed tokens with allowlisted origins.
- Widget bootstrap exists; full in-widget mic client continues to
  deepen toward parity with Sandbox.

---

## 7. Database Design

PostgreSQL 16 via Drizzle ORM. Highlight domains:

| Domain | Tables |
|---|---|
| Auth | `user`, `session`, `account`, `verification` |
| Tenancy | `organizations`, `org_members`, `plans` |
| Agents | `agents`, `agent_versions` |
| Tools | `tools`, `automation_installs` |
| Knowledge | `knowledge_docs`, `knowledge_chunks` |
| Conversations | `conversations`, `messages`, `tool_invocations` |
| Usage | `usage_events`, `usage_daily`, `credit_ledger`, `api_keys` |
| Embed | `embed_configs`, `simulation_scenarios` |
| Webhooks | `webhooks`, `webhook_deliveries` |
| Pack data | restaurant / receptionist / appointments domain tables |

Conventions: UUID primary keys, `org_id` FKs with cascade where
appropriate, soft-delete on agents (`deletedAt`).

---

## 8. Implementation

### 8.1 Monorepo map

| Package / app | Responsibility |
|---|---|
| `apps/api` | Hono routes, middleware, credit helpers |
| `apps/web` | Vite React dashboard, marketing, docs |
| `apps/worker` | BullMQ consumers |
| `apps/widget` | Embed assets |
| `packages/voice` | Pipeline, Groq, Gemini, Scribe, Coqui, Qdrant client |
| `packages/db` | Schema + migrations |
| `packages/auth` | Better Auth + org helpers |
| `packages/tools` | HTTP tool runner |
| `packages/automations` | Pack definitions + executors |
| `packages/usage` | Credit math |
| `packages/shared` | API reference, language, prompt rules |

### 8.2 Key product surfaces (dashboard)

Overview, Agents, Sandbox, Knowledge, Tools, Voices, Workflows,
Guardrails, Integrations, Conversations, Analytics, API keys,
Settings (account, password, credits ledger, privacy export), Admin.

### 8.3 Public surfaces

Landing, pricing, security, legal pages, interactive `/docs`,
unauthenticated `/demo`, OpenAPI at `/api/openapi.json`.

---

## 9. Hybrid AI Stack (Commercial + Open Source)

Voiceify is intentionally **not** “ElevenLabs with a skin.”

### 9.1 Default production path (latency-first)

| Layer | Backend | Notes |
|---|---|---|
| STT live | ElevenLabs Scribe Realtime | Browser WebSocket |
| STT batch | ElevenLabs Scribe v2 | Diarize / refine |
| LLM | Groq **Qwen 3.8 27B** (`qwen/qwen3.8-27b`) | Open weights; verified for low-latency chat and tool calling |
| LLM fallback | Google Gemini 2.5 Flash | Automatic failover |
| TTS | ElevenLabs Flash `eleven_flash_v2_5` | PCM stream |

### 9.2 Optional open-source / self-host path

| Layer | Backend | Activation |
|---|---|---|
| TTS | **Coqui XTTS v2** HTTP worker | `TTS_PROVIDER=coqui` + `COQUI_TTS_URL` |
| Vectors | **Qdrant** | `QDRANT_URL` (+ Compose profile `vectors`) |
| LLM | Qwen 3.8 27B via Groq | Open-weight model; self-hosted vLLM is roadmap |

Health (`/health`, `/api/health`) reports `coqui`, `qdrant`,
`openSource` metadata alongside commercial flags.

### 9.3 Design principle

Commercial speech for SLA demos; open weights for reasoning; optional
self-host for TTS and vectors — one product, multiple backends.

---

## 10. Security and Compliance

### 10.1 Current posture

- Better Auth sessions; password change; password reset via Resend.
- Org RBAC middleware on routes.
- Provider keys server-side only.
- Redis rate limits on sensitive routes.
- Tool SSRF protections in `packages/tools`.
- Threat model documented in `docs/security/threat-model.md`.
- Privacy JSON export: `GET /api/orgs/:orgId/privacy/export`.

### 10.2 Compliance roadmap (explicitly planned)

These are **not fully certified today**; they are first-class future
work called out for enterprise readiness:

| Area | Planned capability |
|---|---|
| GDPR / UK GDPR | Erasure workflow, DPA template, retention schedules |
| SOC 2 Type II | Access reviews, change management, vendor inventory |
| HIPAA | BAA path, stricter logging, PHI redaction modes |
| EU AI Act | Caller AI disclosure badges, logging of high-risk uses |
| Call recording consent | Per-jurisdiction prompts before Sandbox/telephony |
| SSO / SAML / OIDC | Enterprise IdP login |
| Audit log | Immutable admin/operator action stream |
| VPC / private networking | Dedicated deployments for regulated tenants |
| Penetration testing | Annual third-party assessment |

Voiceify already ships the **export** primitive and tenancy
isolation required as foundations for the above.

---

## 11. User Experience and Design System

- Dashboard shell: sticky topbar with centered command search (⌘K),
  actions flush right, Docs opens in a new tab.
- Primary CTAs use a bright teal→emerald gradient with white text
  (consistent “New Agent” look in light and dark themes).
- Voices library cleaned to list rows with Copy ID (no ID spam).
- Docs: searchable sidebar, grouped navigation, OpenAPI shortcuts.
- Page content horizontally centered within the dashboard column.
- Responsive breakpoints for sidebar drawer and topbar compaction.

---

## 12. Deployment and DevOps

### 12.1 Topology

Single EC2 host runs Docker Compose:

```bash
# Core stack
docker compose up -d --build

# TLS (production domain)
docker compose --profile tls up -d --build

# Optional Qdrant
docker compose --profile vectors up -d qdrant
```

### 12.2 CI/CD

GitHub Actions can fetch `main` and recreate `web`/`api` on EC2
(see `docs/deployment/github-actions-ec2.md`).

### 12.3 Configuration

`.env` holds secrets. Model and backend selection:

```
GROQ_MODEL=qwen/qwen3.8-27b
LLM_PROFILE=quality   # or latency
TTS_PROVIDER=elevenlabs   # or coqui
COQUI_TTS_URL=http://xtts:8020
QDRANT_URL=http://qdrant:6333
```

---

## 13. Observability and Operations

- Service health endpoints with provider flags.
- Credit ledger for economic observability per org.
- Conversation and analytics SQL rollups in-dashboard.
- Structured API error logs; worker logs for webhook delivery.
- Runbooks in `docs/ops/runbooks.md`.

Future: OpenTelemetry traces across STT/LLM/TTS spans, Grafana
dashboards for p50/p95 TTFA, alerting on credit soft-warn.

---

## 14. Testing and Quality Assurance

- Vitest unit tests across `packages/voice`, `packages/shared`,
  `apps/web` dashboard helpers.
- Typecheck gates on API and web.
- Strategy doc: `docs/testing/strategy.md`.

Roadmap: Playwright smoke (auth → create agent → sandbox start),
contract tests for OpenAPI, load tests for concurrent turns.

---

## 15. Results and Evaluation

### 15.1 Acceptance criteria (v1)

| Criterion | Status |
|---|---|
| Multi-tenant auth + orgs | Met |
| Custom voice pipeline (not EL Agents API) | Met |
| Sandbox mic with user-initiated start | Met |
| Knowledge ingest + retrieval | Met (Postgres; Qdrant optional) |
| Tools + packs | Met |
| Credits ledger on turns | Met |
| Docs + OpenAPI | Met |
| Hybrid Qwen 3.8 + Coqui/Qdrant hooks | Met (Coqui/Qdrant are configuration-activated) |
| Privacy export | Met |
| Telephony | Not in v1 |
| SOC2 / HIPAA certification | Not in v1 |

### 15.2 Qualitative evaluation

Voiceify successfully demonstrates a **full SaaS shape**: tenancy,
operator UX, metering, packs, and a real orchestration pipeline.
Hybrid backends support a credible narrative that the product is an
orchestration platform, not a single-vendor wrapper.

---

## 16. Limitations

1. **Telephony absent** — no PSTN/SIP yet (ADR 004).
2. **Widget voice** — text and microphone turns are implemented; browser
   Web Speech API support varies by platform.
3. **Workflow graph runtime** — active graphs are persisted server-side
   and injected as conversation guidance. Deterministic branch traversal
   and resumable node state remain future work.
4. **Stripe live** — schema and modes exist; full Checkout/webhooks
   need completion for self-serve card top-ups.
5. **Coqui/Qdrant** — require operator-run services; defaults stay on
   commercial speech + Postgres.
6. **Guardrails** — prompt-injected; not a separate policy engine with
   formal verification.
7. **Single host** — no multi-AZ HA.
8. **Marketing claims** (SSO/VPC on some pages) can outpace
   implementation — roadmap tracks the gap.

---

## 17. Future Work

### 17.1 Near term

- Playwright smoke suite.
- Deeper Qdrant embedding models (sentence-transformers / API embeds).
- Self-hosted vLLM / Ollama profile for fully air-gapped LLM.
- Workflow graph executor.
- Human warm-transfer UI.
- Complete Stripe Checkout + webhooks.

### 17.2 Platform

- Twilio/SIP telephony + recording consent.
- Live call monitor.
- SSO (SAML/OIDC).
- Immutable audit log.
- Customer-managed keys / private deploy.

### 17.3 Compliance and trust

- DPA + subprocessors list.
- Erasure automation.
- AI disclosure banners on embed + phone.
- SOC 2 readiness program.
- Regional data residency options.

### 17.4 Product

- Voice cloning pipeline (ethical consent flows).
- Evaluation harness (scripted conversations, latency SLOs).
- Marketplace for Automation Packs.
- Realtime analytics on barge-in and interrupt rate.

---

## 18. Conclusion

Voiceify is a multi-tenant voice-agent SaaS that owns orchestration,
tenancy, tooling, knowledge, and metering while remaining flexible
about speech and inference backends. By combining **Qwen 3.8 27B** for
generation, optional **Coqui XTTS** and **Qdrant**, and a commercial
low-latency speech path, the platform avoids the “wrapper” trap and
presents a credible path from demo to enterprise requirements —
including the compliance and telephony work still ahead.

---

## 19. References

- Internal ADRs: `docs/architecture/decisions/`
- Architecture overview: `docs/architecture/overview.md`
- Threat model: `docs/security/threat-model.md`
- ElevenLabs integration boundaries: `docs/integrations/elevenlabs.md`
- Open-source stack notes: `docs/integrations/open-source-stack.md`
- Roadmap: `docs/roadmap.md`
- Qwen model documentation; Coqui TTS / XTTS documentation; Qdrant docs
- Groq inference API; Google Gemini API

---

## 20. Appendices

### A. Environment variables (AI backends)

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Llama inference |
| `GROQ_MODEL` | Default `qwen/qwen3.8-27b` |
| `LLM_PROFILE` | `quality` \| `latency` |
| `GEMINI_API_KEY` | Fallback LLM |
| `ELEVENLABS_API_KEY` | Scribe + Flash |
| `TTS_PROVIDER` | `elevenlabs` \| `coqui` |
| `COQUI_TTS_URL` | Self-hosted XTTS base URL |
| `QDRANT_URL` | Vector store |
| `QDRANT_API_KEY` | Optional Qdrant auth |

### B. Compose profiles

| Profile | Services |
|---|---|
| (default) | postgres, redis, api, worker, web, nginx |
| `tls` | caddy |
| `vectors` | qdrant |

### C. Primary HTTP surfaces

| Path | Description |
|---|---|
| `/api/health` | Provider + open-source flags |
| `/api/voice/:orgId/agents/:agentId/turn` | Metered agent turn |
| `/api/orgs/:orgId/knowledge` | Knowledge ingest |
| `/api/orgs/:orgId/privacy/export` | Data portability export |
| `/api/openapi.json` | OpenAPI 3.1 |
| `/docs` | Interactive API documentation |

### D. Product principles

1. Own the orchestration layer.
2. Prefer open weights for reasoning when latency allows.
3. Make self-host backends optional, never fake.
4. Meter everything that costs money.
5. Design for tenancy and export from day one.
6. Document deferred enterprise features honestly in the roadmap.
