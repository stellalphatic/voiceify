/**
 * Canonical voice-agent model IDs — single source of truth.
 * Override via env for staging / A-B tests without code changes.
 */

export const VOICE_MODELS = {
  /** Groq — primary voice LLM (low TTFT). */
  llm: process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant',
  /** Google Gemini — LLM fallback when Groq fails. */
  llmFallback: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  /** ElevenLabs Flash — streamed PCM TTS. */
  tts: process.env.TTS_MODEL?.trim() || 'eleven_flash_v2_5',
  /** ElevenLabs Scribe — server-side batch STT + optional diarization. */
  stt: process.env.STT_MODEL?.trim() || 'scribe_v2',
  /** ElevenLabs Scribe Realtime — browser WebSocket STT (~150ms). */
  sttRealtime: process.env.STT_REALTIME_MODEL?.trim() || 'scribe_v2_realtime',
} as const;

/** LLM generation tuned for sub-500ms spoken replies. */
export const LLM_VOICE_CONFIG = {
  maxOutputTokens: 72,
  temperature: 0.55,
  /** Disable Gemini 2.5 thinking — saves 200–800ms per turn. */
  thinkingBudget: 0,
} as const;

export const VOICE_STACK = {
  stt: `ElevenLabs ${VOICE_MODELS.sttRealtime} (live) + ${VOICE_MODELS.stt} (batch refine)`,
  llm: `Groq ${VOICE_MODELS.llm} (primary) · Google ${VOICE_MODELS.llmFallback} (fallback)`,
  tts: `ElevenLabs ${VOICE_MODELS.tts} PCM`,
} as const;
