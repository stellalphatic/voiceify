/**
 * Shared API security: optional API key, rate limiting, input validation.
 * Used by Express (local dev) and Vercel serverless routes.
 */

export const LIMITS = {
  messageMaxChars: 2000,
  historyMaxItems: 12,
  ttsTextMaxChars: 400,
  audioMaxBytes: 8 * 1024 * 1024,
  rateLimitPerMinute: Number(
    process.env.PUBLIC_VOICE_RATE_LIMIT_PER_MINUTE ??
      (process.env.NODE_ENV === 'production' ? 10 : 60),
  ),
} as const;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (key: string): string => {
    if (headers instanceof Headers) return headers.get(key) ?? '';
    const val = headers[key];
    if (Array.isArray(val)) return val[0] ?? '';
    return val ?? '';
  };
  return (
    get('x-forwarded-for').split(',')[0]?.trim() ||
    get('x-real-ip') ||
    get('cf-connecting-ip') ||
    'local'
  );
}

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (bucket.count >= LIMITS.rateLimitPerMinute) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function verifyApiKey(
  headers: Headers | Record<string, string | string[] | undefined>,
): { ok: true } | { ok: false; message: string } {
  const required = process.env.VOICEIFY_API_KEY?.trim();
  if (!required) {
    const publicVoiceEnabled =
      process.env.PUBLIC_VOICE_ENABLED?.trim().toLowerCase() === 'true';
    if (process.env.NODE_ENV === 'production' && !publicVoiceEnabled) {
      return {
        ok: false,
        message:
          'Public voice API is disabled. Set PUBLIC_VOICE_ENABLED=true intentionally to enable the public demo.',
      };
    }
    return { ok: true };
  }

  const get = (key: string): string => {
    if (headers instanceof Headers) return headers.get(key) ?? '';
    const val = headers[key.toLowerCase()] ?? headers[key];
    if (Array.isArray(val)) return val[0] ?? '';
    return val ?? '';
  };

  const provided = get('x-voiceify-key') || get('authorization').replace(/^Bearer\s+/i, '');
  const ip = getClientIp(headers);
  if (!provided && ip === 'local') return { ok: true };
  if (provided === required) return { ok: true };
  return { ok: false, message: 'Invalid or missing API key' };
}

export function sanitizeHistory(
  raw: unknown,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-LIMITS.historyMaxItems)
    .filter(
      (item): item is { role: 'user' | 'assistant'; content: string } =>
        typeof item === 'object' &&
        item !== null &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string',
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, LIMITS.messageMaxChars),
    }));
}

export function validateMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) return 'Missing message';
  if (trimmed.length > LIMITS.messageMaxChars) {
    return `Message too long (max ${LIMITS.messageMaxChars} characters)`;
  }
  return null;
}

export function validatePersonaId(
  personaId: string,
  valid: Record<string, unknown>,
): string | null {
  if (!valid[personaId]) return 'Unknown persona';
  return null;
}

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

export function guardRequest(
  req: Request,
): Response | { ip: string } {
  const auth = verifyApiKey(req.headers);
  if (auth.ok === false) return jsonResponse({ error: auth.message }, 401);

  const ip = getClientIp(req.headers);
  const rate = checkRateLimit(ip);
  if (rate.ok === false) {
    return jsonResponse(
      { error: 'Rate limit exceeded', retryAfterSec: rate.retryAfterSec },
      429,
      { 'retry-after': String(rate.retryAfterSec) },
    );
  }

  return { ip };
}
