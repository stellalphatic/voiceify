/** Strip text-chat formatting before TTS — voice agents must not speak markdown. */

export function sanitizeVoiceReply(text: string): string {
  let out = text.trim();
  if (!out) return out;

  out = out.replace(/\*\*(.+?)\*\*/g, '$1');
  out = out.replace(/\*(.+?)\*/g, '$1');
  out = out.replace(/`([^`]+)`/g, '$1');
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/^\s*[-*•]\s+/gm, '');
  out = out.replace(/\[(.+?)\]\([^)]+\)/g, '$1');
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}
