import { describe, expect, it } from 'vitest';
import { DEFAULT_VOICE_AGENTS } from './default-agents';
import {
  agentPersonaId,
  findAgentForPersona,
  resolveVoiceAgentRuntime,
  runtimeForPersona,
} from './voice-agent-runtime';

describe('voice-agent-runtime', () => {
  it('links demo personas to isDemoDefault agents', () => {
    expect(findAgentForPersona(DEFAULT_VOICE_AGENTS, 'restaurant')?.name).toBe('Nova');
    expect(findAgentForPersona(DEFAULT_VOICE_AGENTS, 'healthcare')?.name).toBe('Dr. Sarah');
    expect(findAgentForPersona(DEFAULT_VOICE_AGENTS, 'support')?.name).toBe('Alex');
  });

  it('resolves the same runtime fields for dashboard and demo', () => {
    const agent = DEFAULT_VOICE_AGENTS[1];
    const runtime = resolveVoiceAgentRuntime(agent, 'auto');
    expect(runtime.personaId).toBe('healthcare');
    expect(runtime.agentName).toBe('Dr. Sarah');
    expect(runtime.agentConfig?.name).toBe('Dr. Sarah');
    expect(runtime.languageMode).toBe('auto');
  });

  it('uses personaId when set explicitly', () => {
    const agent = DEFAULT_VOICE_AGENTS[3];
    expect(agentPersonaId(agent)).toBe('restaurant');
    expect(agent.isDemoDefault).toBe(false);
  });

  it('builds fallback runtime when persona has no agent', () => {
    const runtime = runtimeForPersona([], 'support', 'en');
    expect(runtime.personaId).toBe('support');
    expect(runtime.languageMode).toBe('en');
    expect(runtime.agentConfig).toBeNull();
  });
});
