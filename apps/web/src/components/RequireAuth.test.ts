import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAuthenticated,
  setAuthToken,
  clearAuthToken,
  VOICEIFY_AUTH_TOKEN_KEY,
} from './RequireAuth';

describe('RequireAuth — token helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns false when no token is stored', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true after a token is set', () => {
    setAuthToken('demo.123');
    expect(isAuthenticated()).toBe(true);
    expect(window.localStorage.getItem(VOICEIFY_AUTH_TOKEN_KEY)).toBe('demo.123');
  });

  it('returns false after token is cleared', () => {
    setAuthToken('demo.123');
    clearAuthToken();
    expect(isAuthenticated()).toBe(false);
  });
});
