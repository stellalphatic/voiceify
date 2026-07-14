function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? 'audio/webm';
}

/** STT/diarization pipelines expect mono 16 kHz — industry standard for speech models. */
const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 16_000 },
};

const MIN_BLOB_BYTES = 1200;

export class UtteranceRecorder {
  private stream: MediaStream | null = null;
  private ownsStream = false;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = pickMimeType();
  private recordingStartedAt = 0;

  async ensureStream(existing?: MediaStream | null): Promise<MediaStream> {
    if (existing?.active) {
      this.stream = existing;
      this.ownsStream = false;
      return existing;
    }
    if (this.stream?.active) return this.stream;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: MIC_CONSTRAINTS,
    });
    this.ownsStream = true;
    return this.stream;
  }

  async start(existingStream?: MediaStream | null): Promise<void> {
    const stream = await this.ensureStream(existingStream);
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: this.mimeType });
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(250);
    this.recordingStartedAt = Date.now();
  }

  async stop(): Promise<{ blob: Blob; mimeType: string; durationMs: number } | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') return null;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.mimeType }));
      };
      recorder.stop();
    });

    this.recorder = null;
    this.chunks = [];

    const durationMs = this.recordingStartedAt ? Date.now() - this.recordingStartedAt : 0;
    this.recordingStartedAt = 0;

    if (blob.size < MIN_BLOB_BYTES) return null;
    return { blob, mimeType: this.mimeType, durationMs };
  }

  release(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.recorder = null;
    this.chunks = [];

    if (this.ownsStream && this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.ownsStream = false;
  }

  getMimeType(): string {
    return this.mimeType;
  }

  /** Shared mic stream for VAD barge-in and diarization capture. */
  getStream(): MediaStream | null {
    return this.stream?.active ? this.stream : null;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
