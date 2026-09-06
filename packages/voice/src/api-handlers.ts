import {
  PERSONAS,
  generateChatReply,
  listElevenLabsVoices,
  synthesizeSpeech,
  type ChatMessage,
} from './voice-handlers';
import { runVoicePipeline, warmupVoicePipeline } from './voice-pipeline';
import { transcribeSpeech } from './stt-diarize';
import { VOICE_MODELS, VOICE_STACK, OPEN_SOURCE_STACK } from './voice-models';
import { isCoquiConfigured } from './coqui-tts';
import { isQdrantConfigured } from './qdrant';
import {
  buildOpenApiSpec,
  resolveBasePersonaId,
  type CustomAgentConfig,
} from '@voiceify/shared';
import { resolveAgentRuntime } from './custom-agent';
import {
  guardRequest,
  jsonResponse,
  LIMITS,
  sanitizeHistory,
  validateMessage,
  validatePersonaId,
} from './api-security';

function parseAgentConfig(raw: unknown): CustomAgentConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== 'string' || !o.name.trim()) return undefined;
  return {
    name: o.name.trim(),
    type: typeof o.type === 'string' ? o.type : 'General',
    language: typeof o.language === 'string' ? o.language : 'English',
    greeting: typeof o.greeting === 'string' ? o.greeting : undefined,
    capabilities: Array.isArray(o.capabilities)
      ? o.capabilities.filter((c): c is string => typeof c === 'string')
      : undefined,
    triggers: Array.isArray(o.triggers)
      ? o.triggers.filter((t): t is string => typeof t === 'string')
      : undefined,
    voiceId: typeof o.voiceId === 'string' ? o.voiceId : undefined,
  };
}

export function handleHealth(): Response {
  const providersConfigured = {
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    coqui: isCoquiConfigured(),
    qdrant: isQdrantConfigured(),
  };
  return jsonResponse({
    status: 'ok',
    service: 'Voiceify Voice Agent',
    providerFlags: 'configured-not-probed',
    providersConfigured,
    ...providersConfigured,
    scribeStt: providersConfigured.elevenlabs,
    scribeRealtime: providersConfigured.elevenlabs,
    diarization: providersConfigured.elevenlabs,
    bargeIn: true,
    models: VOICE_MODELS,
    pipeline: 'stream-pcm',
    targetLatencyMs: 500,
    stack: VOICE_STACK,
    openSource: OPEN_SOURCE_STACK,
    docs: '/docs',
    openapi: '/api/openapi.json',
  });
}

export async function handleScribeRealtimeToken(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  try {
    const { createScribeRealtimeToken } = await import('./scribe-realtime-token');
    const { token } = await createScribeRealtimeToken();
    return jsonResponse({ token });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create Scribe token';
    return jsonResponse({ error: msg }, 502);
  }
}

export async function handleVoiceRespond(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  let body: {
    message?: string;
    personaId?: string;
    history?: ChatMessage[];
    mode?: string;
    language?: string;
    agentConfig?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const message = (body.message ?? '').trim();
  const agentConfig = parseAgentConfig(body.agentConfig);
  const personaId = agentConfig ? resolveBasePersonaId(agentConfig.type) : (body.personaId ?? 'restaurant');
  const msgErr = validateMessage(message);
  if (msgErr) return jsonResponse({ error: msgErr }, 400);
  const personaErr = validatePersonaId(personaId, PERSONAS);
  if (personaErr) return jsonResponse({ error: personaErr }, 400);

  const history = sanitizeHistory(body.history);
  const ttsOnly = body.mode === 'tts_only';

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const event of runVoicePipeline(personaId, message, history, {
          ttsOnly,
          language: body.language,
          customAgent: agentConfig,
        })) {
          controller.enqueue(enc.encode(`${JSON.stringify(event)}\n`));
        }
        controller.close();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Pipeline failed';
        controller.enqueue(enc.encode(`${JSON.stringify({ type: 'error', message: msg })}\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson',
      'cache-control': 'no-store',
    },
  });
}

export async function handleVoiceTranscribe(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  let body: {
    audio?: string;
    mimeType?: string;
    languageCode?: string;
    maxSpeakers?: number;
    diarize?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const audioB64 = body.audio ?? '';
  if (!audioB64) return jsonResponse({ error: 'Missing audio' }, 400);

  const buffer = Buffer.from(audioB64, 'base64');
  if (buffer.byteLength > LIMITS.audioMaxBytes) {
    return jsonResponse({ error: 'Audio payload too large (max 8MB)' }, 413);
  }

  try {
    const result = await transcribeSpeech(buffer, body.mimeType ?? 'audio/webm', {
      languageCode: body.languageCode,
      maxSpeakers: body.maxSpeakers ?? 4,
      diarize: body.diarize === true,
    });
    return jsonResponse(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Transcription failed';
    return jsonResponse({ error: msg }, 502);
  }
}

export async function handleVoiceWarmup(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  let body: { personaId?: string; agentConfig?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const agentConfig = parseAgentConfig(body.agentConfig);
  const personaId = agentConfig ? resolveBasePersonaId(agentConfig.type) : (body.personaId ?? 'restaurant');
  const runtime = resolveAgentRuntime(personaId, agentConfig);
  const voiceId = runtime.voiceId;
  try {
    await warmupVoicePipeline(voiceId);
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ ok: false });
  }
}

export function handleAgents(): Response {
  return jsonResponse(
    Object.values(PERSONAS).map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      voiceId: p.voiceId,
      status: 'active',
      languages: ['en', 'ur', 'auto'],
    })),
  );
}

export async function handleVoiceVoices(): Promise<Response> {
  try {
    const voices = await listElevenLabsVoices();
    return jsonResponse({
      voices: voices.slice(0, 30).map((v) => ({
        id: v.voice_id,
        name: v.name,
        labels: v.labels ?? {},
      })),
      personas: Object.values(PERSONAS).map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        voiceId: p.voiceId,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load voices';
    return jsonResponse({ error: msg }, 502);
  }
}

export async function handleVoiceChat(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  let body: {
    message?: string;
    personaId?: string;
    history?: ChatMessage[];
    language?: string;
    agentConfig?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const agentConfig = parseAgentConfig(body.agentConfig);
  const personaId = agentConfig ? resolveBasePersonaId(agentConfig.type) : (body.personaId ?? 'restaurant');
  const message = (body.message ?? '').trim();
  const msgErr = validateMessage(message);
  if (msgErr) return jsonResponse({ error: msgErr }, 400);
  const personaErr = validatePersonaId(personaId, PERSONAS);
  if (personaErr) return jsonResponse({ error: personaErr }, 400);

  if (message === '__greeting__') {
    const runtime = resolveAgentRuntime(personaId, agentConfig);
    return jsonResponse({ text: runtime.greeting, personaId, usedGemini: false });
  }

  const history = sanitizeHistory(body.history);
  try {
    const reply = await generateChatReply(personaId, message, history, {
      language: body.language,
      customAgent: agentConfig,
    });
    return jsonResponse({
      text: reply,
      personaId,
      usedGemini: Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Chat failed';
    return jsonResponse({ error: msg }, 502);
  }
}

export async function handleElevenLabsTts(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const guard = guardRequest(req);
  if (guard instanceof Response) return guard;

  let body: { text?: string; voiceId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const text = (body.text ?? '').trim();
  const voiceId = (body.voiceId ?? 'EXAVITQu4vr4xnSDxMaL').trim();
  if (!text) return jsonResponse({ error: 'Missing text' }, 400);
  if (text.length > LIMITS.ttsTextMaxChars) {
    return jsonResponse({ error: `Text too long (max ${LIMITS.ttsTextMaxChars} chars)` }, 413);
  }

  try {
    const audio = await synthesizeSpeech(text, voiceId);
    return new Response(audio, {
      status: 200,
      headers: { 'content-type': 'audio/pcm', 'cache-control': 'no-store' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'TTS failed';
    return jsonResponse({ error: msg }, 502);
  }
}

export function handleOpenApi(req: Request): Response {
  const url = new URL(req.url);
  const origin = process.env.APP_URL?.replace(/\/$/, '') || `${url.protocol}//${url.host}`;
  return jsonResponse(buildOpenApiSpec(origin));
}
