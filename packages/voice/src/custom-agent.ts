import type { CustomAgentConfig } from '@voiceify/shared';
import { buildDashboardSystemPrompt, resolveBasePersonaId } from '@voiceify/shared';
import { PERSONAS } from './voice-handlers';

export interface ResolvedAgent {
  personaId: string;
  voiceId: string;
  systemPrompt: string;
  greeting: string;
  name: string;
}

export function resolveAgentRuntime(
  personaId: string,
  custom?: CustomAgentConfig | null,
): ResolvedAgent {
  const base = PERSONAS[personaId] ?? PERSONAS.restaurant;

  if (!custom?.name) {
    return {
      personaId,
      voiceId: base.voiceId,
      systemPrompt: base.systemPrompt,
      greeting: base.greeting,
      name: base.name,
    };
  }

  const mappedId = resolveBasePersonaId(custom.type);
  const mapped = PERSONAS[mappedId] ?? base;

  return {
    personaId: mappedId,
    voiceId: custom.voiceId || mapped.voiceId,
    systemPrompt: buildDashboardSystemPrompt(custom),
    greeting:
      custom.greeting?.trim() ||
      `Hi, I'm ${custom.name}, your ${custom.type} assistant. How can I help?`,
    name: custom.name,
  };
}
