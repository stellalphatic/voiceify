import { Scribe, CommitStrategy, RealtimeEvents, type RealtimeConnection } from '@elevenlabs/client';
import { SCRIBE_REALTIME_MODEL } from './constants';

export type ScribeRealtimeCallbacks = {
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
  onError: (message: string) => void;
  onOpen?: () => void;
};

export class ScribeRealtimeSession {
  private connection: RealtimeConnection | null = null;

  isActive(): boolean {
    return this.connection !== null;
  }

  /** Mic track used by Scribe — available for VAD barge-in while muted. */
  getMediaStreamTrack(): MediaStreamTrack | undefined {
    return this.connection?._mediaStreamTrack;
  }

  async start(options: {
    languageCode?: string;
    callbacks: ScribeRealtimeCallbacks;
  }): Promise<void> {
    const tokenRes = await fetch('/api/voice/transcribe/token');
    if (!tokenRes.ok) throw new Error('Failed to get Scribe realtime token');
    const { token } = (await tokenRes.json()) as { token?: string };
    if (!token) throw new Error('Missing Scribe realtime token');

    const connection = Scribe.connect({
      token,
      modelId: SCRIBE_REALTIME_MODEL,
      commitStrategy: CommitStrategy.VAD,
      vadSilenceThresholdSecs: 0.85,
      vadThreshold: 0.4,
      minSpeechDurationMs: 100,
      minSilenceDurationMs: 300,
      languageCode: options.languageCode,
      noVerbatim: true,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
      const text = data.text?.trim() ?? '';
      if (text) options.callbacks.onPartial(text);
    });

    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
      const text = data.text?.trim() ?? '';
      if (text) options.callbacks.onCommitted(text);
    });

    connection.on(RealtimeEvents.ERROR, (data) => {
      options.callbacks.onError(
        'message' in data && typeof data.message === 'string' ? data.message : 'Scribe realtime error',
      );
    });

    connection.on(RealtimeEvents.AUTH_ERROR, (data) => {
      options.callbacks.onError(
        'message' in data && typeof data.message === 'string' ? data.message : 'Scribe authentication failed',
      );
    });

    connection.on(RealtimeEvents.OPEN, () => {
      options.callbacks.onOpen?.();
    });

    this.connection = connection;
  }

  mute(): void {
    try {
      this.connection?.mute();
    } catch {
      /* microphone-only */
    }
  }

  unmute(): void {
    try {
      this.connection?.unmute();
    } catch {
      /* microphone-only */
    }
  }

  close(): void {
    try {
      this.connection?.close();
    } catch {
      /* ignore */
    }
    this.connection = null;
  }
}
