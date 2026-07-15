import { describe, it, expect } from 'vitest';
import { VOICE_MODELS, LLM_VOICE_CONFIG } from './voice-models';

describe('VOICE_MODELS', () => {
  it('uses production-grade defaults', () => {
    expect(VOICE_MODELS.llm).toBe('llama-3.1-8b-instant');
    expect(VOICE_MODELS.llmFallback).toBe('gemini-2.5-flash');
    expect(VOICE_MODELS.tts).toBe('eleven_flash_v2_5');
    expect(VOICE_MODELS.stt).toBe('scribe_v2');
    expect(VOICE_MODELS.sttRealtime).toBe('scribe_v2_realtime');
  });
});

describe('LLM_VOICE_CONFIG', () => {
  it('disables thinking for low-latency replies', () => {
    expect(LLM_VOICE_CONFIG.thinkingBudget).toBe(0);
    expect(LLM_VOICE_CONFIG.maxOutputTokens).toBeGreaterThan(32);
  });
});
