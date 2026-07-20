/**
 * Hybrid voice stack — commercial low-latency path + open-source self-host path.
 *
 * Defaults favour Groq Llama 3.3 for quality replies with a fast 8B option for
 * sub-500ms turns. TTS/STT can run on ElevenLabs Flash/Scribe or on a self-hosted
 * Coqui XTTS HTTP worker. Knowledge can use Postgres hybrid search or Qdrant.
 */

export type TtsProvider = "elevenlabs" | "coqui";
export type EmbeddingProvider = "local" | "qdrant";
export type LlmProfile = "quality" | "latency";

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

/** Preferred quality LLM on Groq (open-weight Llama 3.3). */
export const LLAMA_33_QUALITY = "llama-3.3-70b-versatile";
/** Low-latency LLM for live voice turns. */
export const LLAMA_31_FAST = "llama-3.1-8b-instant";

export const VOICE_MODELS = {
  /** Groq — primary voice LLM. Default: Llama 3.3 70B (open weights via Groq). */
  llm: env("GROQ_MODEL", LLAMA_33_QUALITY),
  /** Fast profile override when LLM_PROFILE=latency. */
  llmFast: env("GROQ_MODEL_FAST", LLAMA_31_FAST),
  /** Google Gemini — LLM fallback when Groq fails. */
  llmFallback: env("GEMINI_MODEL", "gemini-2.5-flash"),
  /** ElevenLabs Flash — streamed PCM TTS (commercial path). */
  tts: env("TTS_MODEL", "eleven_flash_v2_5"),
  /** Coqui XTTS model id when TTS_PROVIDER=coqui. */
  ttsCoqui: env("COQUI_TTS_MODEL", "xtts_v2"),
  /** ElevenLabs Scribe — server-side batch STT. */
  stt: env("STT_MODEL", "scribe_v2"),
  /** ElevenLabs Scribe Realtime — browser WebSocket STT. */
  sttRealtime: env("STT_REALTIME_MODEL", "scribe_v2_realtime"),
} as const;

export function resolveLlmModel(): string {
  const profile = env("LLM_PROFILE", "quality") as LlmProfile;
  if (profile === "latency") return VOICE_MODELS.llmFast;
  return VOICE_MODELS.llm;
}

export function resolveTtsProvider(): TtsProvider {
  const raw = env("TTS_PROVIDER", "elevenlabs").toLowerCase();
  return raw === "coqui" ? "coqui" : "elevenlabs";
}

export function resolveEmbeddingBackend(): EmbeddingProvider {
  if (env("QDRANT_URL")) return "qdrant";
  return "local";
}

/** LLM generation tuned for spoken replies. */
export const LLM_VOICE_CONFIG = {
  maxOutputTokens: 96,
  temperature: 0.55,
  /** Disable Gemini 2.5 thinking — saves 200–800ms per turn. */
  thinkingBudget: 0,
} as const;

export const VOICE_STACK = {
  stt: `ElevenLabs ${VOICE_MODELS.sttRealtime} (live) + ${VOICE_MODELS.stt} (batch)`,
  llm: `Groq ${resolveLlmModel()} (Llama open weights) · Gemini ${VOICE_MODELS.llmFallback} fallback`,
  tts:
    resolveTtsProvider() === "coqui"
      ? `Coqui XTTS (${VOICE_MODELS.ttsCoqui}) self-hosted`
      : `ElevenLabs ${VOICE_MODELS.tts} PCM`,
  knowledge:
    resolveEmbeddingBackend() === "qdrant"
      ? "Qdrant vector store (tenant collections) + Postgres chunks"
      : "Postgres hybrid (local embeddings + keyword)",
} as const;

export const OPEN_SOURCE_STACK = {
  llm: "Meta Llama 3.3 / 3.1 via Groq (open weights, commercial inference)",
  ttsOptional: "Coqui XTTS v2 (self-hosted HTTP worker)",
  vectorsOptional: "Qdrant (tenant-scoped collections)",
  rationale:
    "Voiceify is a full orchestration platform, not a thin wrapper around a single TTS vendor.",
} as const;
