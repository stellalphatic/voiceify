/**
 * Single runtime shape for every Voiceify voice surface (demo, sandbox, dashboard).
 * Edit agents once → all surfaces pick up the same pipeline config.
 */
import type { CustomAgentConfig, DashboardAgentRecord } from './dashboard-agent';
import {
  resolveBasePersonaId,
  resolveLanguageMode,
  toCustomAgentConfig,
} from './dashboard-agent';
import type { LanguageMode } from './language';

export interface VoiceAgentRuntime {
  agentId?: number;
  personaId: string;
  languageMode: LanguageMode;
  agentConfig: CustomAgentConfig | null;
  customGreeting?: string;
  agentName: string;
}

export type VoiceAgentRecord = DashboardAgentRecord & {
  personaId?: string;
  /** When true, /demo uses this record for its linked personaId. */
  isDemoDefault?: boolean;
};

/** Persisted agent — voice fields + optional dashboard metadata. */
export type StoredVoiceAgent = VoiceAgentRecord & {
  createdAt?: string;
  updatedAt?: string;
  tasks?: unknown[];
};

const VALID_PERSONA_IDS = new Set(['restaurant', 'healthcare', 'support']);

export function normalizePersonaId(personaId: string): string {
  return VALID_PERSONA_IDS.has(personaId) ? personaId : 'restaurant';
}

export function agentPersonaId(agent: VoiceAgentRecord): string {
  if (agent.personaId && VALID_PERSONA_IDS.has(agent.personaId)) return agent.personaId;
  return resolveBasePersonaId(agent.type);
}

/** Resolve runtime config used by useVoiceAgent on client + agentConfig on server. */
export function resolveVoiceAgentRuntime(
  agent: VoiceAgentRecord,
  languageModeOverride?: LanguageMode,
): VoiceAgentRuntime {
  const personaId = agentPersonaId(agent);
  const languageMode = languageModeOverride ?? resolveLanguageMode(agent.language);
  const customGreeting = agent.greeting?.trim() || undefined;

  return {
    agentId: agent.id,
    personaId,
    languageMode,
    agentConfig: toCustomAgentConfig(agent),
    customGreeting,
    agentName: agent.name,
  };
}

/** Demo + API surfaces: pick the canonical agent for a persona id. */
export function findAgentForPersona(
  agents: VoiceAgentRecord[],
  personaId: string,
): VoiceAgentRecord | undefined {
  const id = normalizePersonaId(personaId);

  const demoDefault = agents.find(
    (a) => a.isDemoDefault && agentPersonaId(a) === id,
  );
  if (demoDefault) return demoDefault;

  const explicit = agents.find((a) => a.personaId === id);
  if (explicit) return explicit;

  return agents.find((a) => agentPersonaId(a) === id);
}

export function runtimeForPersona(
  agents: VoiceAgentRecord[],
  personaId: string,
  languageMode: LanguageMode = 'auto',
): VoiceAgentRuntime {
  const agent = findAgentForPersona(agents, personaId);
  if (agent) return resolveVoiceAgentRuntime(agent, languageMode);

  return {
    personaId: normalizePersonaId(personaId),
    languageMode,
    agentConfig: null,
    agentName: personaId,
  };
}
