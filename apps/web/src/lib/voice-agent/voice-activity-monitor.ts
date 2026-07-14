/** RMS-based voice activity detection for barge-in while agent TTS plays. */
export interface VoiceActivityOptions {
  /** RMS threshold (0–1). Default tuned for close-mic speech. */
  threshold?: number;
  /** Consecutive frames above threshold before firing (~60fps). */
  framesRequired?: number;
}

const DEFAULT_THRESHOLD = 0.035;
const DEFAULT_FRAMES = 4;
const STRONG_SPEECH_THRESHOLD = 0.08;

export class VoiceActivityMonitor {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private sustainedFrames = 0;
  private enabled = false;

  start(stream: MediaStream, onSpeech: () => void, options?: VoiceActivityOptions): void {
    this.stop();

    const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
    const framesRequired = options?.framesRequired ?? DEFAULT_FRAMES;

    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    this.ctx = new Ctx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.35;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const data = new Uint8Array(this.analyser.fftSize);
    this.enabled = true;
    this.sustainedFrames = 0;

    const tick = () => {
      if (!this.enabled || !this.analyser) return;

      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const sample = (data[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms >= threshold) {
        this.sustainedFrames += 1;
        const required = rms >= STRONG_SPEECH_THRESHOLD ? Math.max(2, Math.floor(framesRequired / 2)) : framesRequired;
        if (this.sustainedFrames >= required) {
          this.sustainedFrames = 0;
          onSpeech();
        }
      } else {
        this.sustainedFrames = Math.max(0, this.sustainedFrames - 2);
      }

      this.rafId = requestAnimationFrame(tick);
    };

    void this.ctx.resume();
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.enabled = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.source?.disconnect();
    this.source = null;
    this.analyser = null;
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.sustainedFrames = 0;
  }
}
