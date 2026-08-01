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
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}
