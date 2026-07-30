import { describe, expect, it } from 'vitest';
import {
  buildDashboardSystemPrompt,
  defaultGreeting,
  resolveBasePersonaId,
  resolveLanguageMode,
  toCustomAgentConfig,
} from './dashboard-agent';

describe('dashboard-agent', () => {
  it('maps agent types to base personas', () => {
    expect(resolveBasePersonaId('Healthcare')).toBe('healthcare');
    expect(resolveBasePersonaId('Customer Service')).toBe('support');
    expect(resolveBasePersonaId('Receptionist')).toBe('support');
    expect(resolveBasePersonaId('Appointments')).toBe('healthcare');
    expect(resolveBasePersonaId('Real Estate')).toBe('restaurant');
    expect(resolveBasePersonaId('Unknown')).toBe('restaurant');
  });

  it('resolves language modes', () => {
    expect(resolveLanguageMode('English')).toBe('en');
    expect(resolveLanguageMode('Urdu')).toBe('ur');
    expect(resolveLanguageMode('English/Urdu')).toBe('auto');
    expect(resolveLanguageMode('Multilingual')).toBe('auto');
    expect(resolveLanguageMode('Spanish')).toBe('auto');
  });

  it('builds custom system prompt from agent fields', () => {
    const prompt = buildDashboardSystemPrompt({
      name: 'Dr. Sarah',
      type: 'Healthcare',
      language: 'English/Urdu',
      capabilities: ['Booking'],
      triggers: ['pain'],
    });
    expect(prompt).toContain('Dr. Sarah');
    expect(prompt).toContain('Booking');
    expect(prompt).toContain('pain');
  });

  it('uses custom greeting when provided', () => {
    const greeting = defaultGreeting({
      id: 1,
      name: 'Nova',
      type: 'Support',
      language: 'English',
      status: 'Active',
      greeting: 'Hello from Nova!',
    });
    expect(greeting).toBe('Hello from Nova!');
  });

  it('converts dashboard record to custom agent config', () => {
    const cfg = toCustomAgentConfig({
      id: 2,
      name: 'Support Bot',
      type: 'Customer Service',
      language: 'Urdu',
      status: 'Active',
      capabilities: ['FAQ'],
      triggers: ['refund'],
    });
    expect(cfg.name).toBe('Support Bot');
    expect(cfg.voiceId).toBeTruthy();
  });

  it('preserves the user-selected voice over persona defaults', () => {
    const cfg = toCustomAgentConfig({
      id: 3,
      name: 'Custom Voice Agent',
      type: 'Restaurant',
      language: 'English',
      status: 'Active',
      voice: 'VR6AewLTigWG4xSOukaG',
    });
    expect(cfg.voiceId).toBe('VR6AewLTigWG4xSOukaG');
  });
});
