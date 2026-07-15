import { describe, it, expect } from 'vitest';
import {
  buildLanguageInstruction,
  detectLanguage,
  detectLanguageFromAudioMeta,
  getLanguageLabel,
  isConfidentLanguageSwitch,
  normalizeLanguageCode,
  resolveSttLocale,
  toScribeLanguageCode,
} from './language';

describe('detectLanguage', () => {
  it('detects English', () => {
    expect(detectLanguage('Book a table for two tonight please')).toBe('en');
  });

  it('does not misclassify short incomplete English as Portuguese', () => {
    expect(detectLanguage('I want to reser')).toBe('en');
  });

  it('does not misclassify common English booking phrases', () => {
    expect(detectLanguage('I want to book a table')).toBe('en');
  });

  it('detects Portuguese when clearly spoken', () => {
    expect(detectLanguage('Para qual data você gostaria de fazer sua reserva?')).toBe('pt');
  });

  it('detects Urdu script', () => {
    expect(detectLanguage('آج رات کتنے بجے تک کھلا ہے؟')).toBe('ur');
  });

  it('detects Roman Urdu as mixed', () => {
    expect(detectLanguage('Mujhe aaj raat table chahiye')).toBe('mixed');
  });

  it('detects Hindi Devanagari', () => {
    expect(detectLanguage('मुझे कल अपॉइंटमेंट चाहिए')).toBe('hi');
  });

  it('detects Spanish', () => {
    expect(detectLanguage('Buenos días, ¿puedo reservar una mesa para esta noche?')).toBe('es');
  });
});

describe('isConfidentLanguageSwitch', () => {
  it('rejects Portuguese switch from short English fragment', () => {
    expect(isConfidentLanguageSwitch('I want to reser', 'pt', 'en')).toBe(false);
  });

  it('accepts clear Portuguese phrase', () => {
    expect(
      isConfidentLanguageSwitch('Para qual data você gostaria de fazer sua reserva?', 'pt', 'en'),
    ).toBe(true);
  });
});

describe('normalizeLanguageCode', () => {
  it('maps Scribe eng code', () => {
    expect(normalizeLanguageCode('eng')).toBe('en');
  });

  it('maps urd to ur', () => {
    expect(normalizeLanguageCode('urd')).toBe('ur');
  });
});

describe('detectLanguageFromAudioMeta', () => {
  it('prefers Scribe code when confidence high', () => {
    expect(detectLanguageFromAudioMeta('urd', 0.9, 'hello')).toBe('ur');
  });

  it('falls back to text when confidence low', () => {
    expect(detectLanguageFromAudioMeta('eng', 0.1, 'Mujhe table chahiye')).toBe('mixed');
  });
});

describe('resolveSttLocale', () => {
  it('locks English in en mode', () => {
    expect(resolveSttLocale('en', 'ur')).toBe('en-US');
  });

  it('maps Hindi in auto mode', () => {
    expect(resolveSttLocale('auto', 'hi')).toBe('hi-IN');
  });
});

describe('toScribeLanguageCode', () => {
  it('maps Urdu in ur mode', () => {
    expect(toScribeLanguageCode('ur', 'ur')).toBe('urd');
  });

  it('returns undefined in auto mode for auto-detect', () => {
    expect(toScribeLanguageCode('en', 'auto')).toBeUndefined();
  });

  it('returns undefined for mixed language', () => {
    expect(toScribeLanguageCode('mixed', 'en')).toBeUndefined();
  });
});

describe('buildLanguageInstruction', () => {
  it('includes language name for Urdu', () => {
    expect(buildLanguageInstruction('ur')).toContain('Urdu');
  });

  it('handles mixed', () => {
    expect(buildLanguageInstruction('mixed')).toContain('mix');
  });
});

describe('getLanguageLabel', () => {
  it('returns label for known code', () => {
    expect(getLanguageLabel('es')).toBe('Spanish');
  });
});
