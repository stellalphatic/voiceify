/** Strip text-chat formatting before TTS — voice agents must not speak markdown. */

/**
 * Headers of server-injected context. If a model echoes one, everything from that
 * point on is internal instruction text and must never reach the caller's ear.
 */
const INTERNAL_BLOCK =
  /\[\s*(?:tools? available[^\]]*|knowledge base[^\]]*|guardrails?[^\]]*|tool result[^\]]*|system[^\]]*)\]/i;

export function sanitizeVoiceReply(text: string): string {
  let out = text.trim();
  if (!out) return out;

  out = out.replace(/^A:\s*/i, '');
  out = out.replace(/TOOL_CALL\s*\{[\s\S]*$/i, '');

  const internalAt = out.search(INTERNAL_BLOCK);
  if (internalAt >= 0) out = out.slice(0, internalAt);

  out = out.replace(/\*\*(.+?)\*\*/g, '$1');
  out = out.replace(/\*(.+?)\*/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/^\s*[-*•]\s+/gm, '');
  out = out.replace(/\[(.+?)\]\([^)]+\)/g, '$1');

  /**
   * Short bracketed asides are stage directions ("[laughs]", "[pause]",
   * "[excited]"). The streaming TTS model has no audio-tag support, so it reads
   * them out as words. The length bound keeps genuine bracketed prose intact.
   */
  out = out.replace(/\[[^\]]{1,24}\]/g, ' ');

  /* Emoji have no spoken form and are voiced as noise or nothing. */
  out = out.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ' ');

  out = out.replace(/\s+/g, ' ').trim();
  /* Collapse spaces that stripping opened up in front of punctuation. */
  out = out.replace(/\s+([,.!?;:])/g, '$1');

  return out;
}
