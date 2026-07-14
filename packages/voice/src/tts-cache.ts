import { FALLBACK_PATTERNS, PERSONAS, streamSpeechPcm, type PersonaConfig } from './voice-handlers';
import { NOVA_DEMO_SCRIPT } from '@voiceify/shared';

const cache = new Map<string, Uint8Array>();
let preloadPromise: Promise<void> | null = null;

function cacheKey(voiceId: string, text: string): string {
  return `${voiceId}::${text.trim().toLowerCase()}`;
}

export function getCachedPcm(voiceId: string, text: string): Uint8Array | null {
  return cache.get(cacheKey(voiceId, text)) ?? null;
}

async function cacheText(text: string, voiceId: string): Promise<void> {
  const key = cacheKey(voiceId, text);
  if (cache.has(key)) return;

  const chunks: Uint8Array[] = [];
  for await (const chunk of streamSpeechPcm(text, voiceId)) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  cache.set(key, merged);
}

/** Pre-synthesize all demo phrases so pattern-matched replies play in <50ms. */
export async function preloadTtsCache(): Promise<void> {
  const jobs: Array<{ text: string; voiceId: string }> = [];

  for (const persona of Object.values(PERSONAS) as PersonaConfig[]) {
    jobs.push({ text: persona.greeting, voiceId: persona.voiceId });
    jobs.push({ text: persona.greetingUr, voiceId: persona.voiceId });
    if (persona.id === 'restaurant') {
      jobs.push({ text: NOVA_DEMO_SCRIPT.en, voiceId: persona.voiceId });
      jobs.push({ text: NOVA_DEMO_SCRIPT.auto, voiceId: persona.voiceId });
      jobs.push({ text: NOVA_DEMO_SCRIPT.ur, voiceId: persona.voiceId });
    }
    const patterns = FALLBACK_PATTERNS[persona.id] ?? [];
    for (const { reply } of patterns) {
      jobs.push({ text: reply, voiceId: persona.voiceId });
    }
    jobs.push({ text: `Yes, I'm listening! ${persona.name} here — book a table or ask about the menu?`, voiceId: persona.voiceId });
    jobs.push({
      text: `سمجھ گئی! ${persona.name} یہاں ہے — تھوڑا اور بتائیں؟`,
      voiceId: persona.voiceId,
    });
  }

  await runPool(jobs, 3, ({ text, voiceId }) => cacheText(text, voiceId));
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export function kickTtsCachePreload(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = preloadTtsCache().catch((err: unknown): void => {
    console.warn('[tts-cache] preload failed:', err);
    preloadPromise = null;
  });
  return preloadPromise;
}

/** @deprecated Use kickTtsCachePreload — does not block callers. */
export function ensureTtsCache(): Promise<void> {
  void kickTtsCachePreload();
  return Promise.resolve();
}

/** Yield cached PCM in larger chunks — fewer playback boundaries = less noise. */
export async function* yieldCachedPcm(pcm: Uint8Array): AsyncGenerator<Uint8Array> {
  const CHUNK = 12_288;
  for (let i = 0; i < pcm.byteLength; i += CHUNK) {
    yield pcm.subarray(i, Math.min(i + CHUNK, pcm.byteLength));
  }
}
