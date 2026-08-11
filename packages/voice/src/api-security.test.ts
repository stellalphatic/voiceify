import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  sanitizeHistory,
  validateMessage,
  verifyApiKey,
  LIMITS,
} from './api-security';

describe('validateMessage', () => {
  it('rejects empty', () => {
    expect(validateMessage('')).toBe('Missing message');
  });

  it('rejects over limit', () => {
    expect(validateMessage('x'.repeat(LIMITS.messageMaxChars + 1))).toContain('too long');
  });

  it('accepts valid message', () => {
    expect(validateMessage('Book a table')).toBeNull();
  });
});

describe('sanitizeHistory', () => {
  it('filters invalid roles', () => {
    const result = sanitizeHistory([
      { role: 'user', content: 'Hi' },
      { role: 'system', content: 'ignored' },
      { role: 'assistant', content: 'Hello' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
  });

  it('truncates long content', () => {
    const result = sanitizeHistory([{ role: 'user', content: 'a'.repeat(5000) }]);
    expect(result[0].content.length).toBe(LIMITS.messageMaxChars);
  });
});

describe('verifyApiKey', () => {
  const original = process.env.VOICEIFY_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublicVoice = process.env.PUBLIC_VOICE_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.VOICEIFY_API_KEY;
    else process.env.VOICEIFY_API_KEY = original;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPublicVoice === undefined) delete process.env.PUBLIC_VOICE_ENABLED;
    else process.env.PUBLIC_VOICE_ENABLED = originalPublicVoice;
  });

  it('allows when env not set', () => {
    delete process.env.VOICEIFY_API_KEY;
    expect(verifyApiKey({})).toEqual({ ok: true });
  });

  it('fails closed in production unless public voice is explicitly enabled', () => {
    delete process.env.VOICEIFY_API_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.PUBLIC_VOICE_ENABLED;
    expect(verifyApiKey({}).ok).toBe(false);

    process.env.PUBLIC_VOICE_ENABLED = 'true';
    expect(verifyApiKey({})).toEqual({ ok: true });
  });

  it('rejects wrong key when env set', () => {
    process.env.VOICEIFY_API_KEY = 'secret-key';
    expect(verifyApiKey({ 'x-voiceify-key': 'wrong' })).toEqual({
      ok: false,
      message: 'Invalid or missing API key',
    });
  });

  it('accepts matching key', () => {
    process.env.VOICEIFY_API_KEY = 'secret-key';
    expect(verifyApiKey({ 'x-voiceify-key': 'secret-key' })).toEqual({ ok: true });
  });

  it('allows local dev browser without key when env set', () => {
    process.env.VOICEIFY_API_KEY = 'secret-key';
    expect(verifyApiKey({})).toEqual({ ok: true });
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    // fresh IP each test
  });

  it('allows first request', () => {
    expect(checkRateLimit('test-ip-1')).toEqual({ ok: true });
  });
});
