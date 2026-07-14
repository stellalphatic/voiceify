import { describe, it, expect } from 'vitest';
import { FALLBACK_PATTERNS, PERSONAS } from './voice-handlers';
import { detectLanguage } from './language';

describe('PERSONAS', () => {
  it('includes all demo personas', () => {
    expect(PERSONAS.restaurant).toBeDefined();
    expect(PERSONAS.healthcare).toBeDefined();
    expect(PERSONAS.support).toBeDefined();
  });

  it('each persona has system prompt with voice rules', () => {
    for (const persona of Object.values(PERSONAS)) {
      expect(persona.systemPrompt).toContain('ONE sentence');
      expect(persona.systemPrompt).toContain('speech-to-text');
      expect(persona.systemPrompt).toContain('NATO');
      expect(persona.greeting.length).toBeGreaterThan(10);
    }
  });
});

describe('FALLBACK_PATTERNS', () => {
  it('matches hear-me check for restaurant', () => {
    const patterns = FALLBACK_PATTERNS.restaurant;
    const hit = patterns.some((p) => p.match.test('can you hear me'));
    expect(hit).toBe(true);
  });

  it('matches English booking intent for restaurant', () => {
    const patterns = FALLBACK_PATTERNS.restaurant;
    const hit = patterns.some((p) => p.match.test('I want to book a table'));
    expect(hit).toBe(true);
  });

  it('matches Urdu billing for support', () => {
    const patterns = FALLBACK_PATTERNS.support;
    const hit = patterns.some((p) => p.match.test('میرا بل غلط ہے'));
    expect(hit).toBe(true);
  });

  it('matches emergency for healthcare', () => {
    const patterns = FALLBACK_PATTERNS.healthcare;
    const hit = patterns.some((p) => p.match.test('I have chest pain emergency'));
    expect(hit).toBe(true);
  });
});

describe('language integration', () => {
  it('detects multilingual user input', () => {
    expect(detectLanguage('Table chahiye for three please')).toBe('mixed');
  });
});
