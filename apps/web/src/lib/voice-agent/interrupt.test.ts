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
});
