import { describe, expect, it } from 'vitest';
import { sanitizeVoiceReply } from './voice-sanitize';

describe('sanitizeVoiceReply', () => {
  it('strips markdown before TTS', () => {
    expect(sanitizeVoiceReply('**Sure!** What date works?')).toBe('Sure! What date works?');
    expect(sanitizeVoiceReply('- First item\n- Second')).toBe('First item Second');
  });
});
