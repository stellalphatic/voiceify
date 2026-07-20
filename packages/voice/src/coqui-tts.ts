/**
 * Coqui XTTS HTTP client — optional self-hosted TTS backend.
 *
 * Expects a Coqui / XTTS-compatible HTTP worker exposing POST /tts
 * with JSON { text, speaker_wav?, language?, model? } and audio/wav|pcm body.
 * Configure with TTS_PROVIDER=coqui and COQUI_TTS_URL=http://host:8020
 */

export type CoquiSynthInput = {
  text: string;
  language?: string;
  speakerId?: string;
  /** Reference WAV URL or path the worker understands. */
  speakerWav?: string;
};

export type CoquiSynthResult = {
  audio: Buffer;
  contentType: string;
  provider: "coqui";
  model: string;
};

function coquiBaseUrl(): string {
  const url = process.env.COQUI_TTS_URL?.trim();
  if (!url) {
    throw new Error("COQUI_TTS_URL is required when TTS_PROVIDER=coqui");
  }
  return url.replace(/\/$/, "");
}

export function isCoquiConfigured(): boolean {
  return Boolean(process.env.COQUI_TTS_URL?.trim());
}

export async function synthesizeWithCoqui(
  input: CoquiSynthInput,
): Promise<CoquiSynthResult> {
  const model = process.env.COQUI_TTS_MODEL?.trim() || "xtts_v2";
  const res = await fetch(`${coquiBaseUrl()}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      language: input.language ?? "en",
      speaker_id: input.speakerId,
      speaker_wav: input.speakerWav,
      model,
    }),
    signal: AbortSignal.timeout(
      Number(process.env.COQUI_TTS_TIMEOUT_MS ?? 20_000),
    ),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Coqui XTTS failed (${res.status}): ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const arrayBuf = await res.arrayBuffer();
  return {
    audio: Buffer.from(arrayBuf),
    contentType: res.headers.get("content-type") ?? "audio/wav",
    provider: "coqui",
    model,
  };
}
