/** Dashboard custom agents — map to Voiceify voice pipeline (no user API keys). */

import { VOICE_AGENT_RULES } from './voice-prompt-rules';

export interface CustomAgentConfig {
  name: string;
  type: string;
  language: string;
  greeting?: string;
  capabilities?: string[];
  triggers?: string[];
  voiceId?: string;
}

export interface DashboardAgentRecord {
  id: number;
  name: string;
  type: string;
  language: string;
  status: string;
  greeting?: string;
  capabilities?: string[];
  triggers?: string[];
  voice?: string;
}

const BASE_PERSONA_BY_TYPE: Record<string, string> = {
  healthcare: 'healthcare',
  'customer service': 'support',
  support: 'support',
  receptionist: 'support',
  appointments: 'healthcare',
  restaurant: 'restaurant',
  'real estate': 'restaurant',
};

const DEFAULT_VOICE_IDS: Record<string, string> = {
  restaurant: 'EXAVITQu4vr4xnSDxMaL',
  healthcare: '21m00Tcm4TlvDq8ikWAM',
  support: 'pNInz6obpgDQGcFmaJgB',
};

export const DASHBOARD_AGENTS_STORAGE_KEY = 'voiceify.dashboard.agents';

export function resolveBasePersonaId(type: string): string {
  const key = type.trim().toLowerCase();
  return BASE_PERSONA_BY_TYPE[key] ?? 'restaurant';
}

export function resolveLanguageMode(language: string): 'auto' | 'en' | 'ur' {
  const lang = language.toLowerCase().trim();
  if (
    lang.includes('multilingual') ||
    lang.includes('auto') ||
    lang.includes('mixed') ||
    lang.includes('/')
  ) {
    return 'auto';
  }
  if (lang.includes('urdu') || lang === 'ur') return 'ur';
  if (lang.includes('english') || lang === 'en') return 'en';
  // Non EN/UR locales still use auto STT so callers can switch languages.
  return 'auto';
}

export function buildDashboardSystemPrompt(agent: CustomAgentConfig): string {
  const caps =
    agent.capabilities?.filter(Boolean).join(', ') || 'general voice assistance';
  const triggers =
    agent.triggers?.filter(Boolean).join('; ') || 'respond helpfully to any caller request';

  return (
    `You are ${agent.name}, a ${agent.type} voice agent powered by Voiceify.\n` +
    `Capabilities: ${caps}\n` +
    `Trigger context: ${triggers}\n` +
    `Match the caller's language (${agent.language}).\n\n` +
    VOICE_AGENT_RULES
  );
}

export function toCustomAgentConfig(agent: DashboardAgentRecord): CustomAgentConfig {
  const personaId = resolveBasePersonaId(agent.type);
  const selectedVoice = agent.voice?.trim();
  return {
    name: agent.name,
    type: agent.type,
    language: agent.language,
    greeting: agent.greeting?.trim() || undefined,
    capabilities: agent.capabilities,
    triggers: agent.triggers,
    voiceId: selectedVoice || DEFAULT_VOICE_IDS[personaId],
  };
}

export function defaultGreeting(agent: DashboardAgentRecord): string {
  if (agent.greeting?.trim()) return agent.greeting.trim();
  return `Hi, I'm ${agent.name}, your ${agent.type} assistant. How can I help you today?`;
}

export function loadDashboardAgents<T>(fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_AGENTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveDashboardAgents<T>(agents: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DASHBOARD_AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch {
    /* ignore quota errors */
  }
}
