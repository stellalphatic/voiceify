import { describe, it, expect } from 'vitest';
import { getSettingsPageMeta, validateAgentName } from './settings';

describe('getSettingsPageMeta', () => {
  it('shows billing only on settings focus', () => {
    const meta = getSettingsPageMeta('settings');
    expect(meta.showBilling).toBe(true);
    expect(meta.showDevelopers).toBe(false);
    expect(meta.title).toBe('Settings');
  });

  it('shows developers only on api-keys focus', () => {
    const meta = getSettingsPageMeta('api-keys');
    expect(meta.showBilling).toBe(false);
    expect(meta.showDevelopers).toBe(true);
    expect(meta.title).toBe('API keys');
  });
});

describe('validateAgentName', () => {
  it('rejects empty names', () => {
    expect(validateAgentName('')).toBe('Name is required');
    expect(validateAgentName('   ')).toBe('Name is required');
  });

  it('rejects single-character names', () => {
    expect(validateAgentName('A')).toBe('Name must be at least 2 characters');
  });

  it('accepts valid names', () => {
    expect(validateAgentName('Front desk')).toBeUndefined();
    expect(validateAgentName('  Dr. Sarah  ')).toBeUndefined();
  });
});
