/** Target end-to-end voice latency (ms). */
export const LATENCY_TARGET_MS = 500;

/** Wait briefly for Scribe — better transcription + language from audio. */
export const SCRIBE_STT_RACE_MS = 650;

/** Diarization is slower — allow more time before falling back to browser STT. */
export const SCRIBE_DIARIZE_RACE_MS = 1200;

/** Ignore duplicate final transcripts within this window. */
export const DUPLICATE_UTTERANCE_MS = 1200;

/** Minimum user utterance length to process. */
export const MIN_UTTERANCE_CHARS = 2;

/** Ignore mic input right after agent greeting (prevents speaker echo loops). */
export const POST_GREETING_GRACE_MS = 1800;

/** Industry guidance: diarization degrades on clips under ~0.5s — wait longer before cut. */
export const MIN_DIARIZE_CLIP_MS = 800;

/** Minimum encoded audio size before sending diarized Scribe (~1s at low Opus bitrate). */
export const MIN_DIARIZE_AUDIO_BYTES = 2400;

/** Drop Scribe word groups shorter than this when building diarized segments (seconds). */
export const MIN_DIARIZE_SEGMENT_SEC = 0.5;

/** ElevenLabs Scribe Realtime model id (WebSocket STT). */
export const SCRIBE_REALTIME_MODEL = 'scribe_v2_realtime';

/** Play a brief hold line if LLM+TTS takes longer than this (ms). */
export const THINKING_HOLD_MS = 900;

/** Endpointing debounce — longer than raw silence to avoid cutting mid-thought. */
export const ENDPOINT_DEBOUNCE_MS = 550;

/** Abort hung voice pipeline requests so the UI can recover. */
export const VOICE_FETCH_TIMEOUT_MS = 30000;

export const HOLD_PHRASES: Record<'en' | 'ur', string> = {
  en: 'One moment while I check.',
  ur: 'ایک لمحہ، میں دیکھتی ہوں۔',
};
