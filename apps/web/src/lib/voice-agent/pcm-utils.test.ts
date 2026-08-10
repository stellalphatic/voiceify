import { describe, it, expect } from 'vitest';
import {
  concatFloat32,
  decodePcmBase64ToFloat32,
  fadeIn,
  fadeOut,
  measurePeak,
} from './pcm-utils';

describe('fadeIn', () => {
  it('starts at silence and reaches full level', () => {
    const out = fadeIn(new Float32Array(200).fill(0.5), 50);
    expect(out[0]).toBe(0);
    expect(out[49]).toBeGreaterThan(0.4);
    expect(out[100]).toBe(0.5);
  });

  it('leaves everything past the fade untouched', () => {
    const out = fadeIn(new Float32Array(100).fill(0.3), 10);
    expect(out[10]).toBeCloseTo(0.3, 5);
    expect(out[99]).toBeCloseTo(0.3, 5);
  });
});

describe('fadeOut', () => {
  it('ends at silence', () => {
    const out = fadeOut(new Float32Array(200).fill(0.5), 50);
    expect(out[199]).toBe(0);
    expect(out[150]).toBeGreaterThan(0.4);
    expect(out[0]).toBe(0.5);
  });
});

describe('stream continuity', () => {
  /* Regression: interior chunk edges must not be attenuated, because a chunk
     boundary sits in the middle of a continuous waveform. */
  it('preserves sample levels across a concatenated stream', () => {
    const chunks = [
      new Float32Array(100).fill(0.4),
      new Float32Array(100).fill(0.4),
      new Float32Array(100).fill(0.4),
    ];
    const merged = concatFloat32(chunks);
    expect(merged.length).toBe(300);
    for (let i = 0; i < merged.length; i++) {
      expect(merged[i]).toBeCloseTo(0.4, 5);
    }
  });

  it('keeps quiet passages instead of gating them to silence', () => {
    const quiet = new Float32Array(200).fill(0.004);
    const merged = concatFloat32([quiet]);
    expect(measurePeak(merged)).toBeGreaterThan(0);
  });
});

describe('decodePcmBase64ToFloat32', () => {
  it('decodes 16-bit PCM', () => {
    const int16 = new Int16Array([0, 16384, -16384]);
    const bytes = new Uint8Array(int16.buffer);
    const b64 = btoa(String.fromCharCode(...bytes));
    const out = decodePcmBase64ToFloat32(b64);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(3);
    expect(out![1]).toBeCloseTo(0.5, 1);
  });

  it('handles odd byte lengths safely', () => {
    const bytes = new Uint8Array([0, 0, 0xFF]);
    const b64 = btoa(String.fromCharCode(...bytes));
    const out = decodePcmBase64ToFloat32(b64);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(1);
  });
});
