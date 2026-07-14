# ADR 003: Custom STT → LLM → TTS voice pipeline

Date: 2026-07-14  
Status: accepted

## Context

Competitors often wrap a single “conversation API” from one vendor. Voiceify already has a working low-latency pipeline (ElevenLabs Scribe/Flash, Groq, Gemini failover, sanitization, TTS cache) and needs tool calling, Automation Packs, and per-org metering that a black-box agent API would obscure.

## Decision

Own a **custom voice pipeline** in `packages/voice`:

1. Speech-to-text (ElevenLabs)
2. LLM reply with optional tool loop (Groq → Gemini failover)
3. Text sanitize + credit metering hooks
4. Text-to-speech stream (ElevenLabs Flash PCM)

The API exposes stream events (`text`, `ttfa`, `audio`, `done`, `error`) to the widget. We do not depend on ElevenLabs Agents or a third-party orchestration SaaS for core turns.

## Alternatives

| Option | Why not |
|--------|---------|
| ElevenLabs Agents / Conversational AI as the core | Less control over tools, prompts, credits; weaker differentiation |
| Retell / Vapi as the runtime | Becomes a reseller; loses self-hosted cost advantage |
| Single-vendor realtime (e.g. only Gemini Live) | BYOK pain, language/voice lock-in, harder multi-provider failover |
| Fully client-side STT/TTS | Keys leak; inconsistent quality; breaks org metering |

## Consequences

- Latency and quality are our ops problem (provider health, cache, coalescing).
- We maintain prompt rules, sanitize, and language detection ourselves.
- Easier to attach Tools Studio and Automation Packs mid-turn.
- Provider SDK upgrades must be regression-tested against TTFA budgets (see testing strategy).
