/**
 * Low-latency voice pipeline: LLM reply → streamed ElevenLabs PCM.
 * Target: <500ms from request start to first audio byte.
 */
import {
  generateChatReply,
  streamSpeechPcm,
  type ChatMessage,
} from './voice-handlers';
import { resolveAgentRuntime } from './custom-agent';
import type { CustomAgentConfig } from '../shared/dashboard-agent';
import { detectLanguage, normalizeLanguageCode, type LanguageCode } from './language';
import { kickTtsCachePreload, getCachedPcm, yieldCachedPcm } from './tts-cache';
import { sanitizeVoiceReply } from './voice-sanitize';

export type PipelineEvent =
  | { type: 'text'; text: string; llmMs: number; language?: LanguageCode }
  | { type: 'ttfa'; ms: number }
  | { type: 'audio'; data: string }
  | { type: 'done'; totalMs: number; ttfaMs: number | null }
  | { type: 'error'; message: string };

export async function* runVoicePipeline(
  personaId: string,
  message: string,
  history: ChatMessage[],
  options?: { ttsOnly?: boolean; language?: LanguageCode; customAgent?: CustomAgentConfig | null },
): AsyncGenerator<PipelineEvent> {
  const runtime = resolveAgentRuntime(personaId, options?.customAgent);
  const t0 = Date.now();
  let ttfaMs: number | null = null;
  const language = normalizeLanguageCode(options?.language) || detectLanguage(message);

  try {
    kickTtsCachePreload();

    const llmStart = Date.now();
    const rawText = options?.ttsOnly
      ? message.trim()
      : await generateChatReply(personaId, message, history, {
          language,
          customAgent: options?.customAgent,
          runtime,
        });
    const text = sanitizeVoiceReply(rawText);
    const llmMs = Date.now() - llmStart;
    yield { type: 'text', text, llmMs, language };

    const cached = getCachedPcm(runtime.voiceId, text);
    const pcmStream = cached ? yieldCachedPcm(cached) : streamSpeechPcm(text, runtime.voiceId);

    /** Coalesce tiny ElevenLabs chunks — fewer client playback seams. */
    const COALESCE_BYTES = 12_288;
    let pending = new Uint8Array(0);

    const flushPending = function* (): Generator<PipelineEvent> {
      if (pending.byteLength === 0) return;
      yield { type: 'audio', data: Buffer.from(pending).toString('base64') };
      pending = new Uint8Array(0);
    };

    for await (const chunk of pcmStream) {
      if (ttfaMs === null) {
        ttfaMs = Date.now() - t0;
        yield { type: 'ttfa', ms: ttfaMs };
      }

      const merged = new Uint8Array(pending.byteLength + chunk.byteLength);
      merged.set(pending, 0);
      merged.set(chunk, pending.byteLength);
      pending = merged;

      while (pending.byteLength >= COALESCE_BYTES) {
        const slice = pending.subarray(0, COALESCE_BYTES);
        pending = pending.subarray(COALESCE_BYTES);
        yield { type: 'audio', data: Buffer.from(slice).toString('base64') };
      }
    }

    yield* flushPending();

    yield { type: 'done', totalMs: Date.now() - t0, ttfaMs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Pipeline failed';
    yield { type: 'error', message: msg };
  }
}

/** Prime ElevenLabs TCP/TLS connection with a tiny synthesis. */
export async function warmupVoicePipeline(voiceId: string): Promise<void> {
  try {
    for await (const _ of streamSpeechPcm('Hi.', voiceId)) {
      break;
    }
  } catch {
    /* warmup is best-effort */
  }
}
