/**
 * Voiceify REST API reference — single source for /docs and OpenAPI export.
 */

export const API_VERSION = '1.0.0';

export const API_PERSONAS = [
  {
    id: 'restaurant',
    name: 'Nova',
    tagline: 'Rush-hour reservations',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    languages: ['en', 'ur', 'auto'],
  },
  {
    id: 'healthcare',
    name: 'Dr. Sarah',
    tagline: 'No-hold scheduling',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    languages: ['en', 'ur', 'auto'],
  },
  {
    id: 'support',
    name: 'Alex',
    tagline: 'Instant tier-one support',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    languages: ['en', 'ur', 'auto'],
  },
] as const;

export interface ApiParamDoc {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
}

export interface ApiEndpointDoc {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  auth: boolean;
  requestContentType?: string;
  responseContentType: string;
  body?: ApiParamDoc[];
  query?: ApiParamDoc[];
  responseFields?: ApiParamDoc[];
  requestExample?: string;
  responseExample?: string;
  notes?: string[];
  deprecated?: boolean;
  deprecatedAlias?: string;
}

export const API_NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'personas', label: 'Personas' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'errors', label: 'Errors' },
  { id: 'openapi', label: 'OpenAPI' },
] as const;

export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    title: 'Health check',
    description: 'Service status, configured models, and pipeline metadata. No authentication required.',
    auth: false,
    responseContentType: 'application/json',
    responseFields: [
      { name: 'status', type: 'string', desc: 'Always "ok" when the service is running' },
      { name: 'gemini', type: 'boolean', desc: 'Whether GEMINI_API_KEY is configured' },
      { name: 'elevenlabs', type: 'boolean', desc: 'Whether ELEVENLABS_API_KEY is configured' },
      { name: 'models', type: 'object', desc: 'Active LLM, TTS, and STT model IDs' },
      { name: 'stack', type: 'object', desc: 'Human-readable stack summary' },
    ],
    responseExample: `{
  "status": "ok",
  "gemini": true,
  "elevenlabs": true,
  "models": {
    "llm": "gemini-2.5-flash",
    "tts": "eleven_flash_v2_5",
    "stt": "scribe_v2"
  },
  "targetLatencyMs": 500
}`,
    notes: ['Use before starting a voice session to verify keys and models.'],
  },
  {
    id: 'agents',
    method: 'GET',
    path: '/api/agents',
    title: 'List agents',
    description: 'Dashboard-friendly list of demo agent personas.',
    auth: false,
    responseContentType: 'application/json',
    responseExample: `[
  { "id": "restaurant", "name": "Nova", "tagline": "Rush-hour reservations", "status": "active" }
]`,
  },
  {
    id: 'voice-voices',
    method: 'GET',
    path: '/api/voice-voices',
    title: 'List voices & personas',
    description: 'ElevenLabs voices (up to 30) plus Voiceify persona voice mappings.',
    auth: false,
    responseContentType: 'application/json',
    responseExample: `{
  "voices": [{ "id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "labels": {} }],
  "personas": [{ "id": "restaurant", "name": "Nova", "tagline": "Rush-hour reservations", "voiceId": "EXAVITQu4vr4xnSDxMaL" }]
}`,
  },
  {
    id: 'voice-chat',
    method: 'POST',
    path: '/api/voice-chat',
    title: 'Text chat (LLM only)',
    description:
      'Get a text reply from the persona LLM without TTS. Fastest way to test prompts. Send message "__greeting__" for the persona greeting.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'application/json',
    body: [
      { name: 'message', type: 'string', required: true, desc: 'User utterance (max 2000 chars)' },
      { name: 'personaId', type: 'string', desc: 'restaurant | healthcare | support (default: restaurant)' },
      { name: 'history', type: 'array', desc: 'Prior turns: [{ role: "user"|"assistant", content: string }]' },
      { name: 'language', type: 'string', desc: 'Optional ISO code hint: en, ur, etc.' },
    ],
    requestExample: `curl -X POST http://localhost:5173/api/voice-chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "I need a table for four tonight at eight",
    "personaId": "restaurant",
    "history": []
  }'`,
    responseExample: `{
  "text": "Sure! What date, time, and how many guests?",
  "personaId": "restaurant",
  "usedGemini": true
}`,
  },
  {
    id: 'voice-respond',
    method: 'POST',
    path: '/api/voice/respond',
    title: 'Voice pipeline (LLM + TTS stream)',
    description:
      'Full voice agent pipeline. Returns NDJSON stream: text → ttfa → audio chunks → done. Set mode to "tts_only" to skip LLM and synthesize message directly.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'application/x-ndjson',
    body: [
      { name: 'message', type: 'string', required: true, desc: 'User message or TTS text (max 2000 chars)' },
      { name: 'personaId', type: 'string', desc: 'restaurant | healthcare | support' },
      { name: 'history', type: 'array', desc: 'Conversation history for context' },
      { name: 'mode', type: 'string', desc: '"tts_only" skips LLM and streams TTS for message' },
      { name: 'language', type: 'string', desc: 'Reply language hint: en, ur, mixed, etc.' },
    ],
    requestExample: `curl -N -X POST http://localhost:5173/api/voice/respond \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Book a table for two tomorrow at seven",
    "personaId": "restaurant",
    "history": []
  }'`,
    responseExample: `{"type":"text","text":"Sure! What name for the reservation?","llmMs":312,"language":"en"}
{"type":"ttfa","ms":420}
{"type":"audio","data":"<base64 PCM chunk>"}
{"type":"done","totalMs":890,"ttfaMs":420}`,
    notes: [
      'Deprecated alias: POST /api/voice-respond',
      'Audio chunks are 22050 Hz mono PCM, base64-encoded.',
    ],
    deprecatedAlias: '/api/voice-respond',
  },
  {
    id: 'voice-transcribe',
    method: 'POST',
    path: '/api/voice/transcribe',
    title: 'Speech-to-text (Scribe)',
    description: 'Transcribe base64 audio via ElevenLabs Scribe v2. Optional speaker diarization.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'application/json',
    body: [
      { name: 'audio', type: 'string', required: true, desc: 'Base64-encoded audio (max 8 MB decoded)' },
      { name: 'mimeType', type: 'string', desc: 'audio/webm (default), audio/wav, etc.' },
      { name: 'languageCode', type: 'string', desc: 'Scribe hint: eng, urd, etc.' },
      { name: 'diarize', type: 'boolean', desc: 'true enables multi-speaker segmentation (slower)' },
      { name: 'maxSpeakers', type: 'number', desc: '2–8 when diarize is true' },
    ],
    requestExample: `curl -X POST http://localhost:5173/api/voice/transcribe \\
  -H "Content-Type: application/json" \\
  -d '{ "audio": "<base64>", "mimeType": "audio/webm", "diarize": false }'`,
    responseExample: `{
  "text": "I need a table for four tonight",
  "segments": [{ "speakerId": "speaker_0", "speakerLabel": "Caller 1", "text": "I need a table for four tonight" }],
  "languageCode": "eng",
  "languageProbability": 0.97
}`,
    deprecatedAlias: '/api/voice-transcribe',
  },
  {
    id: 'voice-warmup',
    method: 'POST',
    path: '/api/voice/warmup',
    title: 'Warm up TTS',
    description: 'Prime ElevenLabs connection for a persona voice. Call at session start to reduce first-reply latency.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'application/json',
    body: [{ name: 'personaId', type: 'string', desc: 'restaurant | healthcare | support' }],
    responseExample: `{ "ok": true }`,
  },
  {
    id: 'gemini',
    method: 'POST',
    path: '/api/gemini',
    title: 'Gemini text proxy',
    description: 'Server-side Gemini generateContent. API key never exposed to the browser.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'application/json',
    body: [
      { name: 'prompt', type: 'string', required: true, desc: 'Text prompt (max 8000 chars)' },
      { name: 'model', type: 'string', desc: 'Override model (default: gemini-2.5-flash)' },
      { name: 'responseMimeType', type: 'string', desc: 'e.g. application/json for structured output' },
    ],
    requestExample: `curl -X POST http://localhost:5173/api/gemini \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "Summarize Voiceify in one sentence." }'`,
    responseExample: `{ "text": "Voiceify is a sub-500ms voice AI platform..." }`,
  },
  {
    id: 'elevenlabs-tts',
    method: 'POST',
    path: '/api/elevenlabs-tts',
    title: 'TTS (non-streaming)',
    description: 'Synthesize speech as raw PCM audio. For streaming, use POST /api/voice/respond with mode tts_only.',
    auth: true,
    requestContentType: 'application/json',
    responseContentType: 'audio/pcm',
    body: [
      { name: 'text', type: 'string', required: true, desc: 'Text to speak (max 400 chars)' },
      { name: 'voiceId', type: 'string', desc: 'ElevenLabs voice ID' },
    ],
  },
  {
    id: 'openapi',
    method: 'GET',
    path: '/api/openapi',
    title: 'OpenAPI specification',
    description: 'Machine-readable OpenAPI 3.1 JSON for codegen, Postman, and API clients.',
    auth: false,
    responseContentType: 'application/json',
    responseExample: `{ "openapi": "3.1.0", "info": { "title": "Voiceify Voice Agent API" } }`,
  },
];

export const API_ERRORS = [
  { code: 400, title: 'Bad Request', desc: 'Missing or invalid JSON, message, persona, or audio payload.' },
  { code: 401, title: 'Unauthorized', desc: 'Invalid or missing API key when VOICEIFY_API_KEY is set.' },
  { code: 413, title: 'Payload Too Large', desc: 'Message > 2000 chars or audio > 8 MB.' },
  { code: 429, title: 'Rate Limited', desc: '60 requests per minute per IP (sliding window).' },
  { code: 502, title: 'Upstream Error', desc: 'Gemini or ElevenLabs call failed.' },
];

export const NDJSON_EVENTS = [
  { type: 'text', desc: 'LLM reply text', fields: 'text, llmMs, language?' },
  { type: 'ttfa', desc: 'Time to first audio (ms)', fields: 'ms' },
  { type: 'audio', desc: 'PCM chunk', fields: 'data (base64)' },
  { type: 'done', desc: 'Pipeline complete', fields: 'totalMs, ttfaMs' },
  { type: 'error', desc: 'Fatal error', fields: 'message' },
];

export function getApiBaseUrl(origin = ''): string {
  return origin ? `${origin}/api` : '/api';
}

export function buildOpenApiSpec(origin = 'http://localhost:5173'): Record<string, unknown> {
  const paths: Record<string, unknown> = {};

  for (const ep of API_ENDPOINTS) {
    const key = ep.path.replace('/api', '');
    const existing = (paths[key] as Record<string, unknown>) ?? {};
    const operation: Record<string, unknown> = {
      operationId: ep.id,
      summary: ep.title,
      description: ep.description,
      tags: [ep.auth ? 'protected' : 'public'],
      responses: {
        '200': {
          description: 'Success',
          content: ep.responseExample
            ? { [ep.responseContentType]: { example: tryParseJson(ep.responseExample) } }
            : undefined,
        },
      },
    };
    if (ep.auth) {
      operation.security = [{ VoiceifyApiKey: [] }];
    }
    if (ep.body?.length) {
      operation.requestBody = {
        required: true,
        content: {
          [ep.requestContentType ?? 'application/json']: {
            schema: {
              type: 'object',
              properties: Object.fromEntries(
                ep.body.map((p) => [p.name, { type: mapType(p.type), description: p.desc }]),
              ),
              required: ep.body.filter((p) => p.required).map((p) => p.name),
            },
          },
        },
      };
    }
    paths[key] = { ...existing, [ep.method.toLowerCase()]: operation };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Voiceify Voice Agent API',
      version: API_VERSION,
      description: 'REST API for Voiceify voice agents — LLM, STT, and TTS pipeline.',
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        VoiceifyApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-voiceify-key',
          description: 'Optional. Required in production when VOICEIFY_API_KEY env is set.',
        },
      },
    },
    paths,
  };
}

function mapType(t: string): string {
  if (t.includes('array')) return 'array';
  if (t === 'boolean') return 'boolean';
  if (t === 'number') return 'number';
  return 'string';
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
