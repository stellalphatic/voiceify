/**
 * Gap-reduced PCM player — matched sample rate, filter chain, no gain boost.
 * ElevenLabs PCM is played as-is; DSP only removes boundary clicks and background hiss.
 */
import {
  PCM_SAMPLE_RATE,
  concatFloat32,
  decodePcmBase64ToFloat32,
  isAudibleChunk,
  polishPcmChunk,
} from './pcm-utils';

export { PCM_SAMPLE_RATE };

/** Batch ~90ms before scheduling — fewer seams = less boundary noise. */
const MIN_SCHEDULE_SAMPLES = Math.floor(PCM_SAMPLE_RATE * 0.09);
const FIRST_FLUSH_SAMPLES = Math.floor(PCM_SAMPLE_RATE * 0.12);
const OUTPUT_GAIN = 0.9;

/**
 * Lead time given to the first buffer of a stream. Without it the playhead sits
 * exactly on `currentTime`, so any network jitter starves the graph and the
 * agent audibly drops out mid-sentence.
 */
const PREROLL_SEC = 0.18;

export class PcmStreamPlayer {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private highpass: BiquadFilterNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private nextTime = 0;
  private stopped = false;
  private isFirstBuffer = true;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private pendingChunks: Float32Array[] = [];
  private pendingSamples = 0;

  private setupChain(ctx: AudioContext): GainNode {
    const output = ctx.createGain();
    output.gain.value = OUTPUT_GAIN;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 95;
    highpass.Q.value = 0.7;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8_800;
    lowpass.Q.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 10;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.1;

    output.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(ctx.destination);

    this.output = output;
    this.highpass = highpass;
    this.lowpass = lowpass;
    this.compressor = compressor;
    return output;
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio API not supported');

      this.ctx = new Ctx({ sampleRate: PCM_SAMPLE_RATE });
      this.setupChain(this.ctx);
      this.nextTime = 0;
    }

    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  private scheduleBuffer(samples: Float32Array, onFirstSample?: () => void): void {
    const ctx = this.ctx;
    const output = this.output;
    if (!ctx || !output || this.stopped || samples.length === 0) return;

    const now = ctx.currentTime;
    const isFirst = this.nextTime === 0;

    // Silent chunks are not scheduled, but the playhead must still advance or
    // the pause they represent collapses and later audio overlaps.
    if (!isAudibleChunk(samples)) {
      if (!isFirst) this.nextTime += samples.length / PCM_SAMPLE_RATE;
      return;
    }

    const polished = polishPcmChunk(samples);
    const buffer = ctx.createBuffer(1, polished.length, PCM_SAMPLE_RATE);
    buffer.getChannelData(0).set(polished);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(output);

    if (isFirst) {
      this.nextTime = now + PREROLL_SEC;
    } else if (this.nextTime < now) {
      // Underrun: rebuild a smaller cushion instead of clamping flat to `now`,
      // which guaranteed the next chunk would starve again.
      this.nextTime = now + PREROLL_SEC / 2;
    }

    source.start(this.nextTime);
    this.nextTime += buffer.duration;

    this.sources.add(source);
    source.onended = () => this.sources.delete(source);

    if (isFirst) onFirstSample?.();
  }

  private flushPending(onFirstSample?: () => void): void {
    if (this.pendingSamples === 0) return;

    const merged = concatFloat32(this.pendingChunks);
    this.pendingChunks = [];
    this.pendingSamples = 0;
    this.isFirstBuffer = false;
    this.scheduleBuffer(merged, onFirstSample);
  }

  async appendBase64Pcm(base64: string, onFirstSample?: () => void): Promise<void> {
    if (this.stopped) return;
    await this.ensureContext();

    const float32 = decodePcmBase64ToFloat32(base64);
    if (!float32 || float32.length === 0) return;

    this.pendingChunks.push(float32);
    this.pendingSamples += float32.length;

    const threshold = this.isFirstBuffer ? FIRST_FLUSH_SAMPLES : MIN_SCHEDULE_SAMPLES;
    if (this.pendingSamples >= threshold) {
      this.flushPending(onFirstSample);
    }
  }

  async drain(): Promise<void> {
    if (!this.stopped && this.pendingSamples > 0) {
      this.flushPending();
    }

    if (!this.ctx || this.stopped) return;
    const waitMs = Math.max(0, (this.nextTime - this.ctx.currentTime) * 1000);
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs + 30));
    }
  }

  private stopAllSources(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
      source.disconnect();
    }
    this.sources.clear();
  }

  /**
   * Hard stop — closes AudioContext. Only use when ending the whole session.
   * Prefer reset() between turns so reply TTS stays inside the original user gesture.
   */
  stop(): void {
    this.stopped = true;
    this.isFirstBuffer = true;
    this.pendingChunks = [];
    this.pendingSamples = 0;
    this.stopAllSources();

    if (this.output && this.ctx) {
      try {
        this.output.gain.cancelScheduledValues(this.ctx.currentTime);
        this.output.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        /* ignore */
      }
    }

    this.highpass?.disconnect();
    this.lowpass?.disconnect();
    this.compressor?.disconnect();
    this.highpass = null;
    this.lowpass = null;
    this.compressor = null;

    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.output = null;
    this.nextTime = 0;
  }

  /** Soft clear for turn transitions — keeps AudioContext alive for subsequent TTS. */
  reset(): void {
    this.stopAllSources();

    this.stopped = false;
    this.isFirstBuffer = true;
    this.pendingChunks = [];
    this.pendingSamples = 0;
    this.nextTime = 0;

    if (this.output && this.ctx) {
      this.output.gain.cancelScheduledValues(this.ctx.currentTime);
      this.output.gain.setValueAtTime(OUTPUT_GAIN, this.ctx.currentTime);
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  isPlaying(): boolean {
    if (!this.ctx || this.stopped) return false;
    return this.ctx.currentTime < this.nextTime - 0.05 || this.sources.size > 0;
  }
}
