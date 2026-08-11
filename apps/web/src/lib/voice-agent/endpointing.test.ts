import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_COMPLETE_MS,
  ENDPOINT_DEFAULT_MS,
  ENDPOINT_INCOMPLETE_MS,
  resolveEndpointDelay,
} from './endpointing';

describe('resolveEndpointDelay', () => {
  it('waits longer when the caller is mid-thought', () => {
    expect(resolveEndpointDelay('I want to')).toBe(ENDPOINT_INCOMPLETE_MS);
    expect(resolveEndpointDelay('book a table for four and')).toBe(ENDPOINT_INCOMPLETE_MS);
    expect(resolveEndpointDelay('can I speak to the')).toBe(ENDPOINT_INCOMPLETE_MS);
  });

  it('treats a trailing filler as unfinished', () => {
    expect(resolveEndpointDelay('so my name is um')).toBe(ENDPOINT_INCOMPLETE_MS);
  });

  it('responds promptly to short complete answers', () => {
    expect(resolveEndpointDelay('yes')).toBe(ENDPOINT_COMPLETE_MS);
    expect(resolveEndpointDelay('seven pm')).toBe(ENDPOINT_COMPLETE_MS);
  });

  it('does not treat three-word phrases as finished by default', () => {
    expect(resolveEndpointDelay('four people please')).toBe(ENDPOINT_DEFAULT_MS);
  });

  it('responds promptly when punctuation ends the sentence', () => {
    expect(resolveEndpointDelay('I would like a table for two tonight.')).toBe(
      ENDPOINT_COMPLETE_MS,
    );
    expect(resolveEndpointDelay('What time do you close?')).toBe(ENDPOINT_COMPLETE_MS);
  });

  it('handles Urdu sentence-final punctuation', () => {
    expect(resolveEndpointDelay('مجھے ایک میز چاہیے۔')).toBe(ENDPOINT_COMPLETE_MS);
  });

  it('keeps the neutral window for ambiguous unpunctuated speech', () => {
    expect(resolveEndpointDelay('I would like a table for two tonight')).toBe(
      ENDPOINT_DEFAULT_MS,
    );
  });

  it('falls back to the neutral window for empty input', () => {
    expect(resolveEndpointDelay('   ')).toBe(ENDPOINT_DEFAULT_MS);
  });
});
