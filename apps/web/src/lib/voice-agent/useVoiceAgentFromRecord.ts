import { useMemo } from 'react';
import {
  resolveVoiceAgentRuntime,
  type VoiceAgentRecord,
} from '@voiceify/shared';
import type { LanguageMode } from './language';
import { useVoiceAgent, type UseVoiceAgentOptions } from './useVoiceAgent';
import { getPersona } from './personas';
import { getDemoGreeting } from './nova-demo';

/**
 * One hook for every voice surface — demo, sandbox, embed, etc.
 * Pass the same agent record everywhere; runtime stays identical.
 */
export function useVoiceAgentFromRecord(
  agent: VoiceAgentRecord | undefined,
  languageModeOverride?: LanguageMode,
  opts?: {
    autoStart?: boolean;
    orgId?: string | null;
    agentServerId?: string | null;
  },
) {
  const runtime = useMemo(
    () => (agent ? resolveVoiceAgentRuntime(agent, languageModeOverride) : null),
    [
      agent?.id,
      agent?.name,
      agent?.type,
      agent?.language,
      agent?.personaId,
      agent?.greeting,
      agent?.voice,
      agent?.capabilities?.join('|'),
      agent?.triggers?.join('|'),
      languageModeOverride,
    ],
  );

  /* Never auto-start voice unless a surface explicitly opts in (sandbox/demo wait for mic). */
  const autoStart = opts?.autoStart ?? false;

  const options: UseVoiceAgentOptions = runtime
    ? {
        agentConfig: runtime.agentConfig,
        customGreeting: runtime.customGreeting,
        agentName: runtime.agentName,
        sessionId: String(agent?.id ?? runtime.personaId),
        autoStart,
        orgId: opts?.orgId ?? null,
        agentServerId: opts?.agentServerId ?? null,
        initialLanguage: runtime.initialLanguage,
      }
    : { sessionId: 'restaurant', autoStart };

  return useVoiceAgent(
    runtime?.personaId ?? 'restaurant',
    runtime?.languageMode ?? languageModeOverride ?? 'auto',
    options,
  );
}

/** Built-in public demo agents — never take workspace/localStorage records. */
export function buildDemoAgentRecord(
  personaId: string,
  languageMode: LanguageMode = 'auto',
): VoiceAgentRecord {
  const persona = getPersona(personaId);
  const type =
    persona.id === 'healthcare'
      ? 'Healthcare'
      : persona.id === 'support'
        ? 'Customer Service'
        : 'Restaurant';
  const language =
    languageMode === 'ur'
      ? 'Urdu'
      : languageMode === 'en'
        ? 'English'
        : 'English/Urdu';
  const greeting =
    getDemoGreeting(persona.id, languageMode) ??
    (languageMode === 'ur'
      ? persona.greetingUr
      : languageMode === 'auto'
        ? persona.greetingAuto
        : persona.greeting);

  return {
    id: persona.id === 'healthcare' ? 2 : persona.id === 'support' ? 3 : 1,
    name: persona.name,
    type,
    personaId: persona.id,
    isDemoDefault: true,
    language,
    status: 'Active',
    capabilities: persona.tags,
    triggers: [],
    voice: persona.voiceId,
    greeting,
  };
}
