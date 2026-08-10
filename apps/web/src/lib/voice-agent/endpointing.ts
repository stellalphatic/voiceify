/**
 * Semantic endpointing — decide how long to wait for more speech based on
 * whether what the caller has said so far sounds finished.
 *
 * A single fixed silence window has to be pessimistic enough for the slowest
 * speaker, which makes every short answer ("yes", "seven pm") feel sluggish
 * while still cutting off anyone who pauses mid-sentence. Reading the shape of
 * the transcript lets short complete answers through quickly and gives obvious
 * mid-thought pauses more room.
 */

/** Transcript reads as a finished thought — respond promptly. */
export const ENDPOINT_COMPLETE_MS = 280;

/** No strong signal either way. */
export const ENDPOINT_DEFAULT_MS = 550;

/** Clearly mid-thought — wait rather than talk over the caller. */
export const ENDPOINT_INCOMPLETE_MS = 1100;

/**
 * Words that nearly always have more speech behind them: conjunctions,
 * prepositions, articles, auxiliaries, and fillers. Includes the common Urdu /
 * Roman Urdu equivalents since the agent is multilingual.
 */
const TRAILING_INCOMPLETE =
  /^(and|or|but|so|because|if|when|while|that|than|then|to|for|with|from|about|of|at|on|in|the|a|an|my|our|your|is|are|am|was|were|be|been|do|does|did|have|has|had|will|would|could|should|can|may|i|we|you|it|they|he|she|um|uh|er|hmm|like|actually|maybe|aur|ya|lekin|magar|kyunki|agar|phir|toh|ke|ka|ki|mein|par|se|ko)$/i;

/** Sentence-final punctuation. Scribe emits this; browser STT usually does not. */
const TERMINAL_PUNCTUATION = /[.!?。！？؟۔]$/;

/** Short answers that are complete on their own. */
const SHORT_ANSWER_MAX_WORDS = 3;

export function resolveEndpointDelay(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return ENDPOINT_DEFAULT_MS;

  const words = trimmed.split(/\s+/);
  const lastWord = (words[words.length - 1] ?? '').replace(/[^\p{L}\p{N}']/gu, '');

  /* Checked first: "I want to" is short but plainly unfinished. */
  if (TRAILING_INCOMPLETE.test(lastWord)) return ENDPOINT_INCOMPLETE_MS;

  if (TERMINAL_PUNCTUATION.test(trimmed)) return ENDPOINT_COMPLETE_MS;

  if (words.length <= SHORT_ANSWER_MAX_WORDS) return ENDPOINT_COMPLETE_MS;

  /*
   * Longer transcripts without punctuation are ambiguous — the caller may be
   * drawing breath mid-sentence — so keep the neutral window.
   */
  return ENDPOINT_DEFAULT_MS;
}
