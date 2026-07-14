import { useMemo } from 'react';
import {
  resolveVoiceAgentRuntime,
  type VoiceAgentRecord,
} from '@voiceify/shared';
import type { LanguageMode } from './language';
import { useVoiceAgent, type UseVoiceAgentOptions } from './useVoiceAgent';

/**
 * One hook for every voice surface — demo, sandbox, embed, etc.
 * Pass the same agent record everywhere; runtime stays identical.
 */
export function useVoiceAgentFromRecord(
  agent: VoiceAgentRecord | undefined,
  languageModeOverride?: LanguageMode,
  opts?: { autoStart?: boolean },
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
      agent?.capabilities?.join('|'),
      agent?.triggers?.join('|'),
      languageModeOverride,
    ],
  );

  const autoStart = opts?.autoStart ?? true;

  const options: UseVoiceAgentOptions = runtime
    ? {
        agentConfig: runtime.agentConfig,
        customGreeting: runtime.customGreeting,
        agentName: runtime.agentName,
        sessionId: String(agent?.id ?? runtime.personaId),
        autoStart,
      }
    : { sessionId: 'restaurant', autoStart };

  return useVoiceAgent(
    runtime?.personaId ?? 'restaurant',
    runtime?.languageMode ?? languageModeOverride ?? 'auto',
    options,
  );
}
