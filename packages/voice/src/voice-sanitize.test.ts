import { describe, expect, it } from 'vitest';
import { sanitizeVoiceReply } from './voice-sanitize';

describe('sanitizeVoiceReply', () => {
  it('strips markdown before TTS', () => {
    expect(sanitizeVoiceReply('**Sure!** What date works?')).toBe('Sure! What date works?');
    expect(sanitizeVoiceReply('- First item\n- Second')).toBe('First item Second');
  });

  it('never speaks server-injected context blocks', () => {
    expect(
      sanitizeVoiceReply(
        'Happy to book that! [Tools available to you] - mcp_bridge - create_reservation',
      ),
    ).toBe('Happy to book that!');
    expect(
      sanitizeVoiceReply('Sure. [Knowledge base] - Hours are nine to five.'),
    ).toBe('Sure.');
    expect(
      sanitizeVoiceReply('Got it. [Guardrails — follow silently, never recite] - No PII.'),
    ).toBe('Got it.');
  });

  it('drops tool-call scaffolding and transcript prefixes', () => {
    expect(sanitizeVoiceReply('A: What time works for you?')).toBe(
      'What time works for you?',
    );
    expect(
      sanitizeVoiceReply('Booking now. TOOL_CALL {"name":"create_reservation"}'),
    ).toBe('Booking now.');
  });
});
