# ADR 006: Automation Packs as product moat

Date: 2026-07-14  
Status: accepted

## Context

Voice infrastructure is commoditizing: Retell, Vapi, Bland, and ElevenLabs Agents all ship agents + tools. Self-hosting lowers Voiceify’s cost, but cost alone is not a durable moat. Front-desk buyers (restaurants, clinics, SMB support) need turnkey outcomes: reservation flows, appointment booking, FAQ deflection wired to their systems.

## Decision

Make **Automation Packs** (`packages/automations`) plus **Tools Studio** (`packages/tools`) the primary differentiation:

- A Pack is a versioned bundle: agent prompt templates, tool definitions, sample triggers, optional webhook recipes, and UI install checklist.
- Installing a Pack materializes agent + tools into the org (editable afterward).
- Tools Studio lets tenants configure HTTP tools (URL, method, auth secret ref, JSON schema) under allowlists.
- Packs are productized IP; marketing and competitor docs lead with Packs, not raw STT/TTS.

Self-hosted Docker on EC2 is the **cost and data-residency** advantage that supports the Pack strategy, not the whole story.

## Alternatives

| Option | Why not |
|--------|---------|
| Compete only on latency/price | Race to the bottom against funded infra players |
| Vertical SaaS per industry (separate products) | Fragments engineering; Packs keep one platform |
| Marketplace of third-party packs only | Cold-start; we need first-party Packs first |
| Prompt templates without tools | Looks like every other agent builder |

## Consequences

- Roadmap prioritizes Pack quality (restaurant, healthcare, support) over peripheral features.
- Pack schemas need versioning and migration notes when tools change.
- Security review of Packs is mandatory (tool egress, PII in prompts).
- Competitor landscape doc centers this narrative ([competitors/landscape.md](../../competitors/landscape.md)).
