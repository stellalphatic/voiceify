import { describe, expect, it } from 'vitest';
import { isLikelyEcho, isInterruptKeyword, shouldTriggerBargeIn } from './interrupt';

describe('interrupt detection', () => {
  it('allows short intentional interrupt words', () => {
    expect(shouldTriggerBargeIn('ruko', 'Welcome to Voiceify demo')).toBe(true);
    expect(shouldTriggerBargeIn('stop', 'Let me explain the menu options')).toBe(true);
  });

  it('rejects obvious echo of agent speech', () => {
    const agent = 'Hello, I am Nova and I can help with reservations';
    expect(isLikelyEcho('I am nova and I can help', agent)).toBe(true);
    expect(shouldTriggerBargeIn('I am nova and I can help', agent)).toBe(false);
  });

  it('accepts interrupt keywords immediately', () => {
    expect(isInterruptKeyword('stop')).toBe(true);
    expect(isInterruptKeyword('ruko please')).toBe(true);
    expect(shouldTriggerBargeIn('wait', 'long agent monologue here')).toBe(true);
  });

  it('accepts a real user question during agent speech', () => {
    const agent = 'Our clinic opens at nine and closes at six';
    expect(shouldTriggerBargeIn('mujhe appointment chahiye', agent)).toBe(true);
  });

  it('keeps replies that reuse the agent wording', () => {
    // Callers naturally answer with the nouns from the question; treating that
    // as echo silently dropped their turn.
    const agent = 'Would you like a table for four tonight?';
    expect(isLikelyEcho('yes a table for four', agent)).toBe(false);
    expect(shouldTriggerBargeIn('yes a table for four', agent)).toBe(true);

    const clinic = 'We can book you an appointment on Tuesday morning';
    expect(isLikelyEcho('Tuesday morning works', clinic)).toBe(false);
  });

  it('still rejects verbatim playback of agent speech', () => {
    const agent = 'Thanks for calling Voiceify, how can I help you today';
    expect(isLikelyEcho('how can I help you today', agent)).toBe(true);
  });
});
