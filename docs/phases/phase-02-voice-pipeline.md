# Phase 02 — Voice pipeline
Updated: 2026-07-14  
Status: partial (legacy implementation exists)

## Goal

Productionize STT → LLM (+ tools hook) → TTS as an org-authenticated API with metering hooks and stable stream events.

## Scope

- `packages/voice` as the only pipeline implementation
- Hono routes: chat stream, TTS, STT token, diarize (as needed)
- Groq primary / Gemini failover
- ElevenLabs Scribe + Flash; TTS cache
- Sanitize + language detection
- Emit `ttfa` / `done` metrics; prepare usage debit points

## Exit criteria

- [ ] Authenticated voice turn completes under nominal 500ms TTFA on warm path
- [ ] Failover to Gemini when Groq errors
- [ ] No provider keys in browser bundles
- [ ] Unit tests for sanitize, models, security headers

## Non-goals

- Full Tools Studio UI (Phase 03)
- Telephony (ADR 004)
