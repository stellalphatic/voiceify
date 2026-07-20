import { describe, it, expect } from 'vitest';
import {
  VOICE_MODELS,
  LLM_VOICE_CONFIG,
  LLAMA_33_QUALITY,
  OPEN_SOURCE_STACK,
} from './voice-models';

describe('VOICE_MODELS', () => {
  it('defaults to open-weight Llama 3.3 quality path', () => {
    expect(VOICE_MODELS.llm).toBe(LLAMA_33_QUALITY);
    expect(VOICE_MODELS.llmFallback).toBe('gemini-2.5-flash');
    expect(VOICE_MODELS.tts).toBe('eleven_flash_v2_5');
    expect(VOICE_MODELS.stt).toBe('scribe_v2');
    expect(VOICE_MODELS.sttRealtime).toBe('scribe_v2_realtime');
  });

  it('documents the hybrid open-source stack', () => {
    expect(OPEN_SOURCE_STACK.ttsOptional).toMatch(/Coqui/i);
    expect(OPEN_SOURCE_STACK.vectorsOptional).toMatch(/Qdrant/i);
    expect(OPEN_SOURCE_STACK.llm).toMatch(/Llama/i);
  });
});

describe('LLM_VOICE_CONFIG', () => {
  it('disables thinking for low-latency replies', () => {
    expect(LLM_VOICE_CONFIG.thinkingBudget).toBe(0);
    expect(LLM_VOICE_CONFIG.maxOutputTokens).toBeGreaterThan(32);
  });
});
