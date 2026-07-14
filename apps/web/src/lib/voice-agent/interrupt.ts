/** Minimum interim/final length before treating speech as a barge-in. */
export const INTERRUPT_MIN_CHARS = 2;

/** Cooldown between consecutive barge-in triggers (ms). */
export const BARGE_IN_COOLDOWN_MS = 100;

/** After VAD barge-in, wait briefly for STT final before forcing turn processing. */
export const BARGE_IN_FINAL_WAIT_MS = 1500;

/** Short words that always cut agent audio (multilingual). */
const INTERRUPT_KEYWORD =
  /^(stop|wait|hold|ruko|ruk|bas|no|haan|han|yes|listen|hello|hi|hey|excuse|sorry|actually|sun|suno|chup)/i;

const normalizeSpeech = (text: string): string =>
  text.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();

export function isInterruptKeyword(text: string): boolean {
  const normalized = normalizeSpeech(text);
  if (!normalized) return false;
  const first = normalized.split(/\s+/)[0] ?? '';
  return first.length >= 2 && INTERRUPT_KEYWORD.test(first);
}

/** Reject mic input that likely echoes agent TTS from speakers. */
export function isLikelyEcho(userText: string, agentText: string): boolean {
  const u = normalizeSpeech(userText);
  const a = normalizeSpeech(agentText);
  if (!u || u.length < 3 || !a) return false;

  if (a.includes(u) && u.length <= a.length * 0.6) return true;

  const words = u.split(/\s+/).filter((word) => word.length > 2);
  if (words.length < 2) return false;

  const overlap = words.filter((word) => a.includes(word)).length;
  return overlap / words.length >= 0.55;
}

/** Lenient check for intentional user interrupts while the agent is talking. */
export function shouldTriggerBargeIn(userText: string, agentText: string): boolean {
  const text = userText.trim();
  if (text.length < INTERRUPT_MIN_CHARS) return false;

  if (isInterruptKeyword(text)) return true;

  const normalized = normalizeSpeech(text);
  const agent = normalizeSpeech(agentText);
  if (!agent) return true;

  // Short interrupt words ("stop", "ruko", "haan") should still cut off TTS.
  if (normalized.length <= 5) {
    if (agent.startsWith(normalized) && normalized.length <= 4) return false;
    return true;
  }

  return !isLikelyEcho(text, agentText);
}
