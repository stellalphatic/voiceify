/** PCM decode + minimal DSP — no gain boost, no hiss amplification. */

export const PCM_SAMPLE_RATE = 22050;

/** ~3ms fade at 22050 Hz — removes click/pop between streamed chunks. */
export const CHUNK_FADE_SAMPLES = 66;

/** Samples below this level are treated as noise, not speech. */
const NOISE_FLOOR = 0.007;

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

/** Zero near-silence without boosting anything — kills TTS stream padding hiss. */
export function applyNoiseFloor(samples: Float32Array, floor = NOISE_FLOOR): Float32Array {
  const out = new Float32Array(samples);
  for (let i = 0; i < out.length; i++) {
    if (Math.abs(out[i]) < floor) out[i] = 0;
  }
  return out;
}

/** Fade-in/out + soft-clip — boundary cleanup only, no volume normalization. */
export function polishPcmChunk(samples: Float32Array, fadeSamples = CHUNK_FADE_SAMPLES): Float32Array {
  if (samples.length === 0) return samples;

  let out = applyNoiseFloor(samples);
  const fade = Math.min(fadeSamples, Math.floor(out.length / 4));

  if (fade >= 2) {
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      out[i] *= g;
      out[out.length - 1 - i] *= g;
    }
  }

  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    out[i] = Math.tanh(x * 1.05) * 0.97;
  }

  return out;
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

/** Skip buffers that are entirely stream padding (no speech at all). */
export function isAudibleChunk(samples: Float32Array): boolean {
  return measurePeak(samples) >= NOISE_FLOOR;
}
