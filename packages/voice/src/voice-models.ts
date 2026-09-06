/**
 * Hybrid voice stack — commercial low-latency path + open-source self-host path.
 *
 * Defaults favour Groq-hosted Qwen for quality, low-latency replies. TTS/STT
 * can run on ElevenLabs Flash/Scribe or on a self-hosted
 * Coqui XTTS HTTP worker. Knowledge can use Postgres hybrid search or Qdrant.
 */

export type TtsProvider = "elevenlabs" | "coqui";
export type EmbeddingBackend =
  | "postgres-keyword"
  | "postgres-semantic"
  | "qdrant";
export type LlmProfile = "quality" | "latency";

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

/** Current open-weight Groq model verified for chat and tool calling. */
export const QWEN_38_VOICE = "qwen/qwen3.8-27b";

export const VOICE_MODELS = {
  /** Groq primary voice LLM. */
  llm: env("GROQ_MODEL", QWEN_38_VOICE),
  /** Fast profile override when LLM_PROFILE=latency. */
  llmFast: env("GROQ_MODEL_FAST", QWEN_38_VOICE),
  /** Google Gemini — LLM fallback when Groq fails. */
  llmFallback: env("GEMINI_MODEL", "gemini-2.5-flash"),
  /** Eleven v3 Conversational — natural, expressive streamed PCM TTS. */
  tts: env("TTS_MODEL", "eleven_v3_conversational"),
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

export function resolveEmbeddingBackend(): EmbeddingBackend {
  const semanticConfigured = Boolean(
    env("EMBEDDING_API_URL") || env("GEMINI_API_KEY"),
  );
  if (env("QDRANT_URL") && semanticConfigured) return "qdrant";
  return semanticConfigured ? "postgres-semantic" : "postgres-keyword";
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
  llm: `Groq ${resolveLlmModel()} (Qwen open weights) · Gemini ${VOICE_MODELS.llmFallback} fallback`,
  tts:
    resolveTtsProvider() === "coqui"
      ? `Coqui XTTS (${VOICE_MODELS.ttsCoqui}) self-hosted`
      : `ElevenLabs ${VOICE_MODELS.tts} PCM`,
  knowledge:
    resolveEmbeddingBackend() === "qdrant"
      ? "Qdrant vector store (tenant collections) + Postgres chunks"
      : resolveEmbeddingBackend() === "postgres-semantic"
        ? "Postgres semantic vectors + full-text keyword"
        : "Postgres full-text keyword (semantic embeddings not configured)",
} as const;

export const OPEN_SOURCE_STACK = {
  llm: "Qwen 3.8 via Groq (open weights, commercial inference)",
  ttsOptional: "Coqui XTTS v2 (self-hosted HTTP worker)",
  vectorsOptional: "Qdrant (tenant-scoped collections)",
  rationale:
    "Voiceify is a full orchestration platform, not a thin wrapper around a single TTS vendor.",
} as const;
