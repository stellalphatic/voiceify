/** ElevenLabs TTS quality tuning — shared by stream + cache. */
import { VOICE_MODELS } from './voice-models';

export const TTS_MODEL = VOICE_MODELS.tts;
export const PCM_SAMPLE_RATE = 22050;

/** 1 = balanced quality + speed; 0 = best quality (slower). */
export const TTS_STREAM_LATENCY = 1;

/**
 * Upper bound on a single synthesis request. This is a safety valve against a
 * runaway LLM reply, not a style control — spoken replies are already capped by
 * the model's output tokens. It was previously 400, which silently cut longer
 * replies off mid-sentence and was heard as the agent trailing into silence.
 */
export const TTS_MAX_CHARS = 2000;

/**
 * Tuned for natural conversational delivery. High stability with no style makes
 * flash_v2_5 read flat and robotic, which is the usual cause of "it doesn't
 * sound human"; easing stability restores prosody variation, and speaker boost
 * sharpens articulation.
 */
export const TTS_VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.25,
  use_speaker_boost: true,
} as const;

export function ttsStreamUrl(voiceId: string): string {
  return (
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` +
    `?output_format=pcm_${PCM_SAMPLE_RATE}&optimize_streaming_latency=${TTS_STREAM_LATENCY}`
  );
}

export function ttsRequestBody(text: string): string {
  return JSON.stringify({
    text: text.trim().slice(0, TTS_MAX_CHARS),
    model_id: TTS_MODEL,
    voice_settings: { ...TTS_VOICE_SETTINGS },
  });
}
