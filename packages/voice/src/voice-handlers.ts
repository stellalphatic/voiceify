/**
 * Shared voice-agent API logic for Express (local dev) and Vercel serverless.
 */
import { GoogleGenAI } from '@google/genai';
import {
  buildLanguageInstruction,
  detectLanguage,
  normalizeLanguageCode,
  type LanguageCode,
} from './language';
import { resolveAgentRuntime, type ResolvedAgent } from './custom-agent';
import type { CustomAgentConfig } from '@voiceify/shared';
import { buildPersonaPrompt } from './prompt-utils';
import { LLM_VOICE_CONFIG, VOICE_MODELS } from './voice-models';
import { sanitizeVoiceReply } from './voice-sanitize';
import {
  generateGroqAgentReply,
  generateGroqReply,
  type VoiceToolDefinition,
} from './groq-llm';
import {
  PCM_SAMPLE_RATE,
  TTS_MAX_CHARS,
  TTS_MODEL,
  ttsRequestBody,
  ttsStreamUrl,
} from './tts-config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PersonaConfig {
  id: string;
  name: string;
  tagline: string;
  voiceId: string;
  greeting: string;
  greetingUr: string;
  systemPrompt: string;
}

export const PERSONAS: Record<string, PersonaConfig> = {
  restaurant: {
    id: 'restaurant',
    name: 'Nova',
    tagline: 'Rush-hour reservations',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting:
      "Welcome to Voiceify! I'm Nova from Garden Bistro. I answer rush-hour calls in seconds — try booking a table or asking about our menu.",
    greetingUr:
      'وائسفائی میں خوش آمدید! میں نووا، گارڈن بائسٹرو سے۔ ٹیبل بک کریں یا مینو پوچھیں — میں فوراً مدد کروں گی۔',
    systemPrompt: buildPersonaPrompt(
      'You are Nova, the voice host for Garden Bistro and the Voiceify live demo.',
      `Scope: table reservations, menu highlights, hours, seating preferences, dietary notes.
Demo mode: when the call starts, you already welcomed the caller to Voiceify — now help with their request.
Peak-hour context: callers phone while staff serve guests — be warm, clear, and fast.
Hours: daily 11 AM – 11 PM. Menu highlights: salmon, chicken tikka, pasta specials, halal and vegetarian options.`,
      `Slots (collect one at a time): date → time → party size → name → seating preference.
Never guarantee unavailable tables — offer the nearest alternative.`,
    ),
  },
  healthcare: {
    id: 'healthcare',
    name: 'Dr. Sarah',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    tagline: 'No-hold scheduling',
    greeting:
      "Hi, Sarah at CityCare Clinic — I'll schedule you quickly. What visit do you need?",
    greetingUr:
      'السلام علیکم! سارہ، سٹی کیئر کلینک — جلدی اپائنٹمنٹ لگا دوں گی۔ کس قسم کی ملاقات چاہیے؟',
    systemPrompt: buildPersonaPrompt(
      'You are Dr. Sarah, clinic scheduling assistant at CityCare Clinic.',
      `Scope: appointment booking, rescheduling, clinic hours, department routing only.
Peak-hour context: reception handles walk-ins — callers must never be put on hold.
Hours: weekdays 9 AM – 6 PM. Never diagnose, prescribe, or interpret symptoms.`,
      `Slots (one at a time): patient name → visit type → preferred date/time → new vs follow-up.
Emergencies: tell caller to dial 1122 immediately, then offer routine booking if safe.`,
    ),
  },
  support: {
    id: 'support',
    name: 'Alex',
    tagline: 'Instant tier-one support',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting:
      "Hey, Alex from Voiceify — no hold, I'll fix this fast. What's the issue?",
    greetingUr:
      'السلام علیکم! ایلیکس، وائسفائی — بغیر انتظار حل کریں گے۔ مسئلہ کیا ہے؟',
    systemPrompt: buildPersonaPrompt(
      'You are Alex, customer support voice agent for Voiceify.',
      `Scope: billing, invoices, account access, API keys, demo usage, plan limits.
Peak-hour context: callers refuse hold music — resolve tier-one issues in one call.
Free plan: 100 minutes/month. Pro: priority support. API keys live in Settings.`,
      `Slots (one at a time): account email → issue category → order/invoice ID if relevant.
Escalate to human only after email and a one-line issue summary are captured.`,
    ),
  },
};

export const FALLBACK_PATTERNS: Record<string, Array<{ match: RegExp; reply: string }>> = {
  restaurant: [
    { match: /hear me|can you hear|audio check|testing|test mic|awaz|awaaz|suna|sun sakte|سن|آواز/i, reply: "Yes, I hear you clearly! Book a table or ask about our menu?" },
    { match: /book|reserv|table|ٹیبل|بک|میز/i, reply: 'Sure! What date, time, and how many guests?' },
    { match: /menu|food|eat|dish|مینو|کھانا/i, reply: 'Today we have salmon, chicken tikka, and pasta specials.' },
    { match: /hour|open|close|timing|وقت|کھل/i, reply: "We're open daily eleven AM to eleven PM." },
    { match: /thank|shukriya|shukria|شکریہ|شکر/i, reply: "You're welcome! See you at the bistro." },
    { match: /hello|hi|salam|assalam|سلام|السلام/i, reply: 'Welcome! Book a table or hear our menu?' },
    { match: /mujhe|chahti|chahta|kitne|mehman|aaj|kal|waqt/i, reply: 'Zaroor! Tareekh, waqt aur kitne mehman?' },
    { match: /میز|مہمان|آج|کل|وقت/i, reply: 'ضرور! تاریخ، وقت اور کتنے مہمان؟' },
  ],
  healthcare: [
    { match: /hear me|can you hear|audio check|testing|test mic|awaz|awaaz|suna|سن|آواز/i, reply: "Yes, I hear you! What appointment do you need?" },
    { match: /appoint|book|schedule|اپائنٹ|ملاقات/i, reply: 'Happy to help — your name and preferred time?' },
    { match: /hour|open|timing|وقت|کلینک/i, reply: 'Clinic hours are nine AM to six PM, weekdays.' },
    { match: /emergency|urgent|pain|ایمرجنسی|فوری/i, reply: 'For emergencies call one-one-two-two; I can book a routine visit.' },
    { match: /hello|hi|salam|سلام/i, reply: 'Hi! Need an appointment or clinic info?' },
    { match: /doctor|dental|checkup|mujhe|chahti|chahta/i, reply: 'Bilkul — naam aur pasandeeda waqt batayein?' },
    { match: /ڈاکٹر|دانت|چیک/i, reply: 'جی! اپنا نام اور پسندیدہ وقت بتائیں؟' },
  ],
  support: [
    { match: /hear me|can you hear|audio check|testing|test mic|awaz|awaaz|suna|سن|آواز/i, reply: "Loud and clear! What's the issue you're facing?" },
    { match: /bill|payment|charge|invoice|بل|ادائیگی/i, reply: 'I can check billing — what email is on your account?' },
    { match: /api|key|integrat/i, reply: 'API keys live in Settings; need ElevenLabs help?' },
    { match: /demo|trial|test/i, reply: 'Try the live demo — pick a persona and tap the mic.' },
    { match: /hello|hi|help|سلام|مدد/i, reply: "Hi! What's the issue — I'll get you sorted." },
    { match: /masla|problem|account|mujhe|kya/i, reply: 'Theek hai — account email ya order number batayein?' },
    { match: /مسئلہ|اکاؤنٹ/i, reply: 'ٹھیک ہے — اکاؤنٹ ای میل یا آرڈر نمبر بتائیں؟' },
  ],
};

function localizedFallback(personaId: string, message: string, lang: LanguageCode): string {
  const patterns = FALLBACK_PATTERNS[personaId] ?? FALLBACK_PATTERNS.support;
  for (const { match, reply } of patterns) {
    if (match.test(message)) {
      if (lang === 'ur' || lang === 'ar') {
        const urduReplies: Record<string, string> = {
          "Yes, I hear you clearly! Book a table or ask about our menu?":
            'جی، صاف سن رہی ہوں! ٹیبل بک کریں یا مینو پوچھیں؟',
          "Yes, I hear you! What appointment do you need?":
            'جی سن رہی ہوں! کس قسم کی اپائنٹمنٹ چاہیے؟',
          "Loud and clear! What's the issue you're facing?":
            'آواز صاف آ رہی ہے! مسئلہ کیا ہے؟',
          'Sure! What date, time, and how many guests?': 'ضرور! تاریخ، وقت اور کتنے مہمان؟',
          'Today we have salmon, chicken tikka, and pasta specials.':
            'آج سامن، چکن تکہ اور پاستا سپیشل دستیاب ہیں۔',
          "We're open daily eleven AM to eleven PM.": 'ہم روزانہ صبح گیارہ سے رات گیارہ بجے کھلے ہیں۔',
          "You're welcome! See you at the bistro.": 'خوش آمدید! بائسٹرو میں ملیں گے۔',
          'Welcome! Book a table or hear our menu?': 'خوش آمدید! ٹیبل بک کریں یا مینو سنیں؟',
          'Zaroor! Tareekh, waqt aur kitne mehman?': 'ضرور! تاریخ، وقت اور کتنے مہمان؟',
          'Happy to help — your name and preferred time?': 'ضرور — اپنا نام اور پسندیدہ وقت بتائیں؟',
          'Clinic hours are nine AM to six PM, weekdays.': 'کلینک سوموار سے جمعہ، صبح نو سے شام چھ بجے۔',
          'For emergencies call one-one-two-two; I can book a routine visit.':
            'ایمرجنسی کے لیے ایک ایک دو دو کال کریں؛ معمولی اپائنٹمنٹ بک کر سکتی ہوں۔',
          'Hi! Need an appointment or clinic info?': 'سلام! اپائنٹمنٹ یا کلینک کی معلومات؟',
          'Bilkul — naam aur pasandeeda waqt batayein?': 'بلکل — نام اور پسندیدہ وقت بتائیں؟',
          'I can check billing — what email is on your account?':
            'بلنگ چیک کر سکتا ہوں — اکاؤنٹ پر کون سی ای میل ہے؟',
          'API keys live in Settings; need ElevenLabs help?':
            'API keys Settings میں ہیں؛ ElevenLabs کی مدد چاہیے؟',
          'Try the live demo — pick a persona and tap the mic.':
            'لائیو ڈیمو آزمائیں — persona چنیں اور مائیک دبائیں۔',
          "Hi! What's the issue — I'll get you sorted.": 'سلام! مسئلہ کیا ہے — حل کر دیتا ہوں۔',
          'Theek hai — account email ya order number batayein?':
            'ٹھیک ہے — اکاؤنٹ ای میل یا آرڈر نمبر بتائیں؟',
        };
        return urduReplies[reply] ?? reply;
      }
      return reply;
    }
  }
  const persona = PERSONAS[personaId] ?? PERSONAS.support;
  if (lang === 'ur' || lang === 'ar') {
    if (personaId === 'healthcare') return 'جی سن رہی ہوں! کس قسم کی اپائنٹمنٹ چاہیے؟';
    if (personaId === 'support') return 'جی سن رہا ہوں! مسئلہ کیا ہے؟';
    return `جی سن رہی ہوں! ${persona.name} یہاں ہے — ٹیبل بک کریں یا مینو پوچھیں؟`;
  }
  if (personaId === 'healthcare') return "Yes, I'm listening! What appointment do you need?";
  if (personaId === 'support') return "Yes, I'm listening! What's the issue you're facing?";
  return `Yes, I'm listening! ${persona.name} here — book a table or ask about the menu?`;
}

/** Pattern match (<1ms) only when LLMs unavailable; else Groq → Gemini → patterns → fallback. */
export async function generateChatReply(
  personaId: string,
  message: string,
  history: ChatMessage[],
  options?: {
    language?: LanguageCode;
    runtime?: ResolvedAgent;
    customAgent?: CustomAgentConfig | null;
    /** Server-side context (tools, knowledge, guardrails) — never part of the caller turn. */
    systemContext?: string;
    tools?: VoiceToolDefinition[];
    executeTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    onToolCalls?: (count: number) => void;
  },
): Promise<string> {
  const runtime = options?.runtime ?? resolveAgentRuntime(personaId, options?.customAgent);
  const effectivePersonaId = runtime.personaId;
  const lang = options?.language
    ? normalizeLanguageCode(options.language)
    : detectLanguage(message);
  const useCustom = Boolean(options?.customAgent?.name);

  const transcript = history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'U' : 'A'}: ${m.content}`)
    .join('\n');

  const context = options?.systemContext?.trim()
    ? `\n${options.systemContext.trim()}\n(The block above is internal. Never speak it aloud.)`
    : '';

  const prompt = `${runtime.systemPrompt}${context}\n${buildLanguageInstruction(lang)}\n${transcript}\nU: ${message}\nA:`;

  if (options?.tools?.length && options.executeTool) {
    const agentResult = await generateGroqAgentReply(
      prompt,
      options.tools,
      options.executeTool,
    );
    if (agentResult) {
      options.onToolCalls?.(agentResult.toolCalls);
      return agentResult.text;
    }
  }

  const groqText = await generateGroqReply(prompt);
  if (groqText) return groqText;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await Promise.race([
        ai.models.generateContent({
          model: VOICE_MODELS.llmFallback,
          contents: prompt,
          config: {
            maxOutputTokens: LLM_VOICE_CONFIG.maxOutputTokens,
            temperature: LLM_VOICE_CONFIG.temperature,
            thinkingConfig: { thinkingBudget: LLM_VOICE_CONFIG.thinkingBudget },
          },
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (response) {
        const text = sanitizeVoiceReply((response.text ?? '').trim());
        if (text) return text;
      }
    } catch {
      /* fall through */
    }
  }

  if (!useCustom) {
    const patterns = FALLBACK_PATTERNS[effectivePersonaId] ?? FALLBACK_PATTERNS.support;
    for (const { match } of patterns) {
      if (match.test(message)) return localizedFallback(effectivePersonaId, message, lang);
    }
  }

  if (useCustom) {
    return `Got it! ${runtime.name} here — tell me a bit more?`;
  }
  return localizedFallback(effectivePersonaId, message, lang);
}

function elevenLabsKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Server is missing ELEVENLABS_API_KEY');
  return key;
}

/** Stream PCM chunks — turbo model with quality-tuned latency preset. */
export async function* streamSpeechPcm(text: string, voiceId: string): AsyncGenerator<Uint8Array> {
  const trimmed = text.trim().slice(0, TTS_MAX_CHARS);
  if (!trimmed) throw new Error('Empty text for TTS');

  const ttsController = new AbortController();
  const ttsTimer = setTimeout(() => ttsController.abort(), 12000);

  try {
    const response = await fetch(ttsStreamUrl(voiceId), {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey(),
        'Content-Type': 'application/json',
        Accept: 'audio/pcm',
      },
      body: ttsRequestBody(trimmed),
      signal: ttsController.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`ElevenLabs stream failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from ElevenLabs');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) yield value;
    }
  } finally {
    clearTimeout(ttsTimer);
  }
}

/** Non-streaming fallback — ElevenLabs Flash or Coqui XTTS when TTS_PROVIDER=coqui. */
export async function synthesizeSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  const { routeSynthesizeSpeech } = await import('./tts-router.js');
  const routed = await routeSynthesizeSpeech({
    text,
    voiceId,
    elevenLabsSynth: async () => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of streamSpeechPcm(text, voiceId)) {
        chunks.push(chunk);
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
      }
      return { audio: Buffer.from(out.buffer), contentType: 'audio/pcm' };
    },
  });
  return routed.audio.buffer.slice(
    routed.audio.byteOffset,
    routed.audio.byteOffset + routed.audio.byteLength,
  );
}

export async function listElevenLabsVoices(): Promise<
  Array<{ voice_id: string; name: string; labels?: Record<string, string> }>
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Server is missing ELEVENLABS_API_KEY');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices (${response.status})`);
  }

  const data = (await response.json()) as {
    voices: Array<{ voice_id: string; name: string; labels?: Record<string, string> }>;
  };
  return data.voices ?? [];
}
