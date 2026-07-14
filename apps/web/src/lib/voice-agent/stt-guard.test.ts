import { describe, expect, it } from 'vitest';
import { isLikelySttHallucination } from './stt-guard';

describe('isLikelySttHallucination', () => {
  it('flags known Whisper-style hallucinations', () => {
    expect(isLikelySttHallucination('Subtitles by Amara.org')).toBe(true);
    expect(isLikelySttHallucination('Thank you for watching')).toBe(true);
  });

  it('allows normal caller speech', () => {
    expect(isLikelySttHallucination('I need a table for four tonight')).toBe(false);
    expect(isLikelySttHallucination('میرا بل غلط ہے')).toBe(false);
  });
});
