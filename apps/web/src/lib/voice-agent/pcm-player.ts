/**
 * Gapless PCM stream player.
 *
 * The stream is played as it arrives. There is deliberately no per-chunk fading,
 * noise gating, soft-clipping, low-pass or compression: the source is already a
 * clean 22.05 kHz waveform from the TTS provider, and every one of those steps
 * measurably degraded it. The only processing is a gentle high-pass to drop DC
 * offset and sub-audible rumble, plus fades at the true edges of an utterance.
 */
import {
  EDGE_FADE_SAMPLES,
  PCM_SAMPLE_RATE,
  concatFloat32,
  decodePcmBase64ToFloat32,
  fadeIn,
  fadeOut,
} from './pcm-utils';

export { PCM_SAMPLE_RATE };

/**
 * Buffering budget. The first flush is deliberately small so speech starts
 * quickly; later chunks batch a little more to keep the scheduler cheap.
 */
const FIRST_FLUSH_SAMPLES = Math.floor(PCM_SAMPLE_RATE * 0.05);
const MIN_SCHEDULE_SAMPLES = Math.floor(PCM_SAMPLE_RATE * 0.08);

/**
 * Lead time for the first buffer. Without a cushion the playhead sits on
 * currentTime and ordinary network jitter starves the graph mid-word. This is
 * the dominant tunable in perceived start latency, so keep it as small as
 * jitter tolerance allows.
 */
const PREROLL_SEC = 0.1;

/** Cushion rebuilt after an underrun, smaller so recovery is not audible as a gap. */
const RECOVERY_SEC = 0.06;

const OUTPUT_GAIN = 1;

/**
 * Level the agent drops to while a possible interruption is being confirmed by
 * STT. Quiet enough that the user talks over it comfortably and gets immediate
 * feedback, loud enough that the reply is not lost if the trigger was echo.
 */
const DUCK_GAIN = 0.18;

export class PcmStreamPlayer {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private highpass: BiquadFilterNode | null = null;
  private nextTime = 0;
  private stopped = false;
  private isFirstBuffer = true;
  private underruns = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private pendingChunks: Float32Array[] = [];
  private pendingSamples = 0;

  private setupChain(ctx: AudioContext): GainNode {
    const output = ctx.createGain();
    output.gain.value = OUTPUT_GAIN;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 70;
    highpass.Q.value = 0.5;

    output.connect(highpass);
    highpass.connect(ctx.destination);

    this.output = output;
    this.highpass = highpass;
    return output;
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio API not supported');

      this.ctx = new Ctx({ sampleRate: PCM_SAMPLE_RATE, latencyHint: 'interactive' });
      this.setupChain(this.ctx);
      this.nextTime = 0;
    }

    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  private scheduleBuffer(
    samples: Float32Array,
    opts: { isUtteranceStart: boolean; isUtteranceEnd: boolean },
    onFirstSample?: () => void,
  ): void {
    const ctx = this.ctx;
    const output = this.output;
    if (!ctx || !output || this.stopped || samples.length === 0) return;

    if (opts.isUtteranceStart) fadeIn(samples, EDGE_FADE_SAMPLES);
    if (opts.isUtteranceEnd) fadeOut(samples, EDGE_FADE_SAMPLES);

    const buffer = ctx.createBuffer(1, samples.length, PCM_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(output);

    const now = ctx.currentTime;
    if (opts.isUtteranceStart) {
      this.nextTime = now + PREROLL_SEC;
    } else if (this.nextTime < now) {
      // Ran dry while waiting on the network. Rebuild a small cushion rather
      // than clamping to now, which would starve again on the next chunk.
      this.underruns += 1;
      this.nextTime = now + RECOVERY_SEC;
    }

    source.start(this.nextTime);
    this.nextTime += buffer.duration;

    this.sources.add(source);
    source.onended = () => this.sources.delete(source);

    if (opts.isUtteranceStart) onFirstSample?.();
  }

  private flushPending(isUtteranceEnd: boolean, onFirstSample?: () => void): void {
    if (this.pendingSamples === 0) return;

    const merged = concatFloat32(this.pendingChunks);
    this.pendingChunks = [];
    this.pendingSamples = 0;

    const isUtteranceStart = this.isFirstBuffer;
    this.isFirstBuffer = false;
    this.scheduleBuffer(merged, { isUtteranceStart, isUtteranceEnd }, onFirstSample);
  }

  async appendBase64Pcm(base64: string, onFirstSample?: () => void): Promise<void> {
    if (this.stopped) return;
    await this.ensureContext();
    if (this.stopped) return;

    const float32 = decodePcmBase64ToFloat32(base64);
    if (!float32 || float32.length === 0) return;

    this.pendingChunks.push(float32);
    this.pendingSamples += float32.length;

    const threshold = this.isFirstBuffer ? FIRST_FLUSH_SAMPLES : MIN_SCHEDULE_SAMPLES;
    if (this.pendingSamples >= threshold) {
      this.flushPending(false, onFirstSample);
    }
  }

  /** Flush the tail and wait for playback to finish. */
  async drain(): Promise<void> {
    if (!this.stopped && this.pendingSamples > 0) {
      this.flushPending(true);
    }

    if (!this.ctx || this.stopped) return;
    const waitMs = Math.max(0, (this.nextTime - this.ctx.currentTime) * 1000);
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs + 20));
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
   * Hard stop — closes the AudioContext. Only for ending a whole session.
   * Prefer reset() between turns so reply audio stays inside the original
   * user gesture and is not blocked by autoplay policy.
   */
  stop(): void {
    this.stopped = true;
    this.isFirstBuffer = true;
    this.pendingChunks = [];
    this.pendingSamples = 0;
    this.stopAllSources();

    this.highpass?.disconnect();
    this.highpass = null;

    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.output = null;
    this.nextTime = 0;
  }

  /** Soft clear for turn transitions — keeps the AudioContext alive. */
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

  /** Attenuate output without stopping the stream (unconfirmed barge-in). */
  duck(level = DUCK_GAIN): void {
    const ctx = this.ctx;
    const output = this.output;
    if (!ctx || !output) return;
    const now = ctx.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(level, now + 0.05);
  }

  /** Restore full output after an unconfirmed barge-in turned out to be echo. */
  unduck(): void {
    const ctx = this.ctx;
    const output = this.output;
    if (!ctx || !output) return;
    const now = ctx.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(OUTPUT_GAIN, now + 0.08);
  }

  isPlaying(): boolean {
    if (!this.ctx || this.stopped) return false;
    return this.ctx.currentTime < this.nextTime - 0.05 || this.sources.size > 0;
  }

  /** Buffer starvation count, surfaced for latency diagnostics. */
  getUnderrunCount(): number {
    return this.underruns;
  }
}
