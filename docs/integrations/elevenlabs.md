# ElevenLabs integration

Updated: 2026-07-14

## What we use

| Product | Role |
|---------|------|
| Scribe Realtime | Browser STT via single-use token |
| Scribe v2 | Batch refine / diarize |
| Flash TTS (`eleven_flash_v2_5`) | PCM 22.05kHz streaming |

We do **not** use ElevenLabs Conversational AI agents. Orchestration is custom (Groq/Gemini + tools).

## Secrets

- `ELEVENLABS_API_KEY` — server only (`apps/api`, worker never needs it today)

## Endpoints

- `POST /api/voice/transcribe/token` → single-use realtime token
- `POST /api/voice/transcribe` → batch
- Voice pipeline TTS inside `packages/voice`

## Failure modes

| Failure | Behavior |
|---------|----------|
| Missing key | Token/TTS endpoints return 5xx with clear error |
| Rate limit | Surface upstream status; Redis rate limit protects our API |
| TTS latency spike | Cached greetings via `tts-cache` |

## Cost control

- Prefer Flash model
- Cache short greetings
- Meter TTS chars into `usage_events`
