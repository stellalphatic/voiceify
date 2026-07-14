# Competitor Landscape
Updated: 2026-07-14

Voiceify positions against voice-agent platforms. Comparison is product-level for v1 (web voice; no telephony yet).

## Snapshot

| Dimension | Retell | Vapi | Bland | ElevenLabs Agents | Voiceify |
|-----------|--------|------|-------|-------------------|----------|
| Core offer | Phone + web voice agents | Dev platform for voice | Phone agents at scale | Conversational AI on EL stack | Multi-tenant SaaS + Packs |
| Telephony | Strong | Strong | Strong (focus) | Limited / partner | **Out of v1** |
| Self-host | No | No | No | No | **Yes (EC2 Docker)** |
| Tooling | Built-in + custom | Deep custom | Custom actions | Tools in EL ecosystem | **Tools Studio** |
| Vertical accelerators | Templates | Examples | Playbooks | Voices/personas | **Automation Packs** |
| LLM flexibility | Configurable | Bring models | Configurable | EL-centric | Groq + Gemini (+ path to more) |
| Billing model | Usage | Usage | Usage | EL usage | **Credit wallet** (Stripe test → live) |
| Ideal buyer | Ops + CX | Developers | Outbound/phone teams | Teams already on EL | SMB front-desk + agencies wanting control |

## Retell

Strengths: polished phone product, latency focus, agent builder.  
Weaknesses for our buyers: SaaS lock-in, less “install a restaurant pack and own the stack” story.  
Voiceify angle: Packs + self-host cost/control; web-first until telephony ADR.

## Vapi

Strengths: developer-friendly orchestration, flexible providers.  
Weaknesses: you still assemble the product; not a turnkey SMB SaaS.  
Voiceify angle: opinionated dashboard, org tenancy, credit wallet, Packs as finished goods.

## Bland

Strengths: phone scale, outbound, simple ops narrative.  
Weaknesses: less of a multi-product SaaS/workspace play; phone-centric.  
Voiceify angle: inbound web widget + Tools Studio for systems of record; telephony later.

## ElevenLabs Agents

Strengths: best-in-class voices, tight STT/TTS integration, fast demos.  
Weaknesses: orchestration and multi-tenant SaaS features are not the product center; pricing tied to EL.  
Voiceify angle: we **use** ElevenLabs as a provider inside our pipeline (ADR 003) while owning agents, tools, Packs, billing, and tenancy.

## Voiceify moat (explicit)

1. **Automation Packs** — versioned, installable industry bundles (prompts + tools + checklists).
2. **Tools Studio** — tenant-managed HTTP tools with allowlists, secrets refs, and org scope.
3. **Self-hosted cost & residency** — single EC2 Docker stack; keys and transcripts stay on your host.

Infra parity (STT/LLM/TTS) is necessary but not sufficient. Do not market “we are cheaper Retell” without Packs shipping.

## Tracking

Revisit this file when telephony launches or when a Pack vertical wins a design partner. Update dates when claims change.
