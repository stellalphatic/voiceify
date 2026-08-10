/**
 * PCM decode helpers.
 *
 * The TTS stream arrives as consecutive slices of one continuous waveform, so
 * the samples across a chunk boundary are already contiguous. Earlier revisions
 * faded every chunk edge, hard-gated quiet samples and soft-clipped the whole
 * buffer; at ~90ms per chunk that stamped an amplitude dip into the audio ten
 * times a second, which is what the "cut-offs" and muffled delivery were. Fades
 * belong only at the true start and end of an utterance.
 */

export const PCM_SAMPLE_RATE = 22050;

/** ~4ms at 22050 Hz — long enough to avoid a click, short enough to be inaudible. */
export const EDGE_FADE_SAMPLES = 88;

export function decodePcmBase64ToFloat32(base64: string): Float32Array | null {
  const binary = atob(base64);
  if (binary.length < 2) return null;

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const sampleBytes = bytes.byteLength - (bytes.byteLength % 2);
  if (sampleBytes < 2) return null;

  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleBytes / 2);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}

export function measurePeak(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return peak;
}

/** Ramp up from silence at the very start of an utterance. Mutates in place. */
export function fadeIn(samples: Float32Array, fadeSamples = EDGE_FADE_SAMPLES): Float32Array {
  const fade = Math.min(fadeSamples, samples.length);
  for (let i = 0; i < fade; i++) samples[i] *= i / fade;
  return samples;
}

/** Ramp down to silence at the very end of an utterance. Mutates in place. */
export function fadeOut(samples: Float32Array, fadeSamples = EDGE_FADE_SAMPLES): Float32Array {
  const fade = Math.min(fadeSamples, samples.length);
  for (let i = 0; i < fade; i++) {
    samples[samples.length - 1 - i] *= i / fade;
  }
  return samples;
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
