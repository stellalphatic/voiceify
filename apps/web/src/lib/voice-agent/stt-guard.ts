/** Reject common STT hallucinations on silence or noise (Whisper-class models). */

const HALLUCINATION_PATTERNS: RegExp[] = [
  /subtitles?\s+by/i,
  /amara\.org/i,
  /thank you for watching/i,
  /please subscribe/i,
  /transcribed by/i,
  /copyright/i,
  /^\.+$/,
  /^you$/i,
  /^thanks?\.?$/i,
];

export function isLikelySttHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 3) return false;

  return HALLUCINATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}
