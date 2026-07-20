/**
 * TTS router — ElevenLabs (default) or Coqui XTTS (self-hosted).
 */

import { synthesizeWithCoqui, isCoquiConfigured } from "./coqui-tts.js";
import { resolveTtsProvider } from "./voice-models.js";

export type RoutedTtsInput = {
  text: string;
  language?: string;
  voiceId?: string;
  /** ElevenLabs synthesizer callback used when provider is elevenlabs. */
  elevenLabsSynth: () => Promise<{
    audio: Buffer;
    contentType: string;
  }>;
};

export async function routeSynthesizeSpeech(input: RoutedTtsInput): Promise<{
  audio: Buffer;
  contentType: string;
  provider: "elevenlabs" | "coqui";
}> {
  if (resolveTtsProvider() === "coqui") {
    if (!isCoquiConfigured()) {
      throw new Error("TTS_PROVIDER=coqui but COQUI_TTS_URL is not set");
    }
    const result = await synthesizeWithCoqui({
      text: input.text,
      language: input.language,
      speakerId: input.voiceId,
    });
    return {
      audio: result.audio,
      contentType: result.contentType,
      provider: "coqui",
    };
  }

  const result = await input.elevenLabsSynth();
  return { ...result, provider: "elevenlabs" };
}
