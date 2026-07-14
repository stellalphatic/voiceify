import { describe, it, expect } from 'vitest';
import {
  applyNoiseFloor,
  decodePcmBase64ToFloat32,
  isAudibleChunk,
  measurePeak,
  polishPcmChunk,
} from './pcm-utils';

describe('applyNoiseFloor', () => {
  it('zeros near-silence without boosting', () => {
    const hiss = new Float32Array(200).fill(0.004);
    const out = applyNoiseFloor(hiss);
    expect(measurePeak(out)).toBe(0);
  });

  it('preserves speech-level samples', () => {
    const speech = new Float32Array(100).fill(0.12);
    const out = applyNoiseFloor(speech);
    expect(measurePeak(out)).toBeCloseTo(0.12, 2);
  });
});

describe('polishPcmChunk', () => {
  it('soft-clips loud peaks without harsh clipping', () => {
    const loud = new Float32Array([0.95, -0.9, 0.5]);
    const out = polishPcmChunk(loud);
    expect(Math.abs(out[0])).toBeLessThanOrEqual(0.92);
  });

  it('fades chunk edges to reduce boundary clicks', () => {
    const samples = new Float32Array(200).fill(0.5);
    const out = polishPcmChunk(samples, 50);
    expect(out[0]).toBe(0);
    expect(out[49]).toBeGreaterThan(0.4);
  });
});

describe('isAudibleChunk', () => {
  it('rejects noise-only padding', () => {
    expect(isAudibleChunk(new Float32Array(500).fill(0.003))).toBe(false);
  });

  it('accepts real speech', () => {
    expect(isAudibleChunk(new Float32Array(500).fill(0.12))).toBe(true);
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
