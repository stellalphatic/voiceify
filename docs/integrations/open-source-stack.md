# Open-source and hybrid AI stack
Updated: 2026-09-06

Voiceify is an orchestration platform. Speech and inference providers are swappable backends, not the product itself.

## Always on (default)

| Layer | Choice | Why |
|-------|--------|-----|
| LLM | **Qwen 3.8 27B** via Groq (`qwen/qwen3.8-27b`) | Open weights and verified low-latency chat/tool calling |
| LLM fallback | Gemini 2.5 Flash | Optional resilience when `GEMINI_API_KEY` is configured |
| STT / TTS | ElevenLabs Scribe + Flash | Sub-500ms path for demos and SLAs |

## Optional self-host

| Layer | Choice | Enable |
|-------|--------|--------|
| TTS | **Coqui XTTS v2** HTTP worker | `TTS_PROVIDER=coqui` + `COQUI_TTS_URL` |
| Vectors | **Qdrant** tenant collections | `QDRANT_URL` + `docker compose --profile vectors up -d qdrant` |

Postgres remains the system of record for knowledge chunks even when Qdrant is enabled.

## Code map

- Models / stack strings: `packages/voice/src/voice-models.ts`
- Coqui client: `packages/voice/src/coqui-tts.ts`
- TTS router: `packages/voice/src/tts-router.ts`
- Qdrant client: `packages/voice/src/qdrant.ts`
- Knowledge mirror/search: `apps/api/src/routes/knowledge.ts`
- Health flags: `packages/voice/src/api-handlers.ts` (`coqui`, `qdrant`, `openSource`)

## What this is not

- Not a claim that Coqui/Qdrant run without configuration.
- Not ElevenLabs Conversational Agents (rejected in ADR 003).
- Not fully air-gapped LLM yet (vLLM/Ollama profile is roadmap).
