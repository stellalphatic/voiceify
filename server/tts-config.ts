/** ElevenLabs TTS quality tuning — shared by stream + cache. */
import { VOICE_MODELS } from './voice-models';

export const TTS_MODEL = VOICE_MODELS.tts;
export const PCM_SAMPLE_RATE = 22050;

/** 1 = balanced quality + speed; 0 = best quality (slower). */
export const TTS_STREAM_LATENCY = 1;

export const TTS_VOICE_SETTINGS = {
  stability: 0.68,
  similarity_boost: 0.85,
  style: 0,
  use_speaker_boost: false,
} as const;

export function ttsStreamUrl(voiceId: string): string {
  return (
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` +
    `?output_format=pcm_${PCM_SAMPLE_RATE}&optimize_streaming_latency=${TTS_STREAM_LATENCY}`
  );
}

export function ttsRequestBody(text: string): string {
  return JSON.stringify({
    text: text.trim().slice(0, 400),
    model_id: TTS_MODEL,
    voice_settings: { ...TTS_VOICE_SETTINGS },
  });
}
