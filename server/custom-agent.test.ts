import { describe, expect, it } from 'vitest';
import { resolveAgentRuntime } from './custom-agent';

describe('resolveAgentRuntime', () => {
  it('returns base persona when no custom agent', () => {
    const runtime = resolveAgentRuntime('healthcare');
    expect(runtime.personaId).toBe('healthcare');
    expect(runtime.name).toBeTruthy();
    expect(runtime.voiceId).toBeTruthy();
  });

  it('merges custom dashboard agent with mapped persona', () => {
    const runtime = resolveAgentRuntime('restaurant', {
      name: 'Dr. Sarah',
      type: 'Healthcare',
      language: 'English/Urdu',
      greeting: 'Hi, I am Dr. Sarah.',
      capabilities: ['Booking'],
      triggers: ['appointment'],
    });
    expect(runtime.personaId).toBe('healthcare');
    expect(runtime.name).toBe('Dr. Sarah');
    expect(runtime.greeting).toBe('Hi, I am Dr. Sarah.');
    expect(runtime.systemPrompt).toContain('Dr. Sarah');
    expect(runtime.systemPrompt).toContain('Booking');
  });
});
