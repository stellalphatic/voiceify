# 007. Hybrid commercial + open-source voice backends
Date: 2026-07-20
Status: accepted

## Context
Buyers and technical reviewers often dismiss voice SaaS products as thin wrappers around a single TTS vendor. Voiceify already owns orchestration (tenancy, tools, packs, credits). We need first-class hooks for open-weight LLMs and optional self-hosted TTS/vectors without abandoning the low-latency commercial speech path.

## Decision
1. Default LLM to Groq-hosted **Llama 3.3** (`llama-3.3-70b-versatile`), with a latency profile for Llama 3.1 8B.
2. Keep ElevenLabs Scribe/Flash as the default STT/TTS path.
3. Add optional **Coqui XTTS** via `TTS_PROVIDER=coqui` and `COQUI_TTS_URL`.
4. Add optional **Qdrant** via `QDRANT_URL` and Compose profile `vectors`, mirroring knowledge chunks while Postgres stays source of truth.
5. Surface backend flags on `/health` so operators can verify what is live.

## Alternatives
- ElevenLabs Agents only: rejected (ADR 003).
- Require self-hosted STT/TTS for all tenants: rejected for v1 SLA risk.
- Fake “open source” in marketing without code paths: rejected.

## Consequences
Operators can demo hybrid architecture honestly. Self-host services are opt-in. Documentation must state activation requirements clearly (see `docs/integrations/open-source-stack.md` and `docs/PROJECT_REPORT.md`).
