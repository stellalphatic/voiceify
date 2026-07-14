/**
 * ElevenLabs Scribe STT — primary transcription + optional speaker diarization.
 *
 * Pipeline targets customer-service voice AI: mono 16 kHz mic, 1–10s utterance
 * chunks, Scribe v2 diarization when clip length supports stable clustering.
 */
import { VOICE_MODELS } from './voice-models';

const MIN_STT_AUDIO_BYTES = 1200;
const MIN_DIARIZE_AUDIO_BYTES = 2400;
const MIN_DIARIZE_SEGMENT_SEC = 0.5;

export interface DiarizedSegment {
  speakerId: string;
  speakerLabel: string;
  text: string;
  start?: number;
  end?: number;
}

export interface DiarizedTranscript {
  text: string;
  segments: DiarizedSegment[];
  languageCode: string;
  languageProbability: number;
}

interface ScribeWord {
  text: string;
  start?: number;
  end?: number;
  type?: string;
  speaker_id?: string | null;
}

interface ScribeResponse {
  text: string;
  language_code: string;
  language_probability: number;
  words: ScribeWord[];
}

export function formatSpeakerLabel(speakerId: string): string {
  if (speakerId === 'agent') return 'Agent';
  if (speakerId === 'customer') return 'Caller';
  const match = speakerId.match(/speaker_(\d+)/i);
  if (match) return `Caller ${Number(match[1]) + 1}`;
  return speakerId.replace(/_/g, ' ');
}

export function groupWordsIntoSegments(words: ScribeWord[]): DiarizedSegment[] {
  const segments: DiarizedSegment[] = [];
  let current: DiarizedSegment | null = null;

  for (const word of words) {
    if (word.type === 'audio_event') continue;

    if (word.type === 'spacing') {
      if (current) current.text += word.text;
      continue;
    }

    const speakerId = word.speaker_id ?? 'speaker_0';
    if (!current || current.speakerId !== speakerId) {
      if (current) segments.push(current);
      current = {
        speakerId,
        speakerLabel: formatSpeakerLabel(speakerId),
        text: word.text,
        start: word.start,
        end: word.end,
      };
    } else {
      current.text += word.text;
      current.end = word.end ?? current.end;
    }
  }

  if (current) {
    const trimmed = current.text.trim();
    if (trimmed) segments.push({ ...current, text: trimmed });
  }

  return segments;
}

function dropShortDiarizedSegments(segments: DiarizedSegment[]): DiarizedSegment[] {
  const kept = segments.filter((segment) => {
    if (segment.start == null || segment.end == null) return true;
    return segment.end - segment.start >= MIN_DIARIZE_SEGMENT_SEC;
  });
  return kept.length ? kept : segments;
}

function elevenLabsKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Server is missing ELEVENLABS_API_KEY');
  return key;
}

export interface TranscribeOptions {
  languageCode?: string;
  maxSpeakers?: number;
  /** When true, returns per-speaker segments (slower). Default false for single-caller STT. */
  diarize?: boolean;
}

/** Scribe STT — used as primary transcription when ElevenLabs key is configured. */
export async function transcribeSpeech(
  audio: Buffer,
  mimeType: string,
  options?: TranscribeOptions,
): Promise<DiarizedTranscript> {
  const diarize = options?.diarize ?? false;
  const minBytes = diarize ? MIN_DIARIZE_AUDIO_BYTES : MIN_STT_AUDIO_BYTES;

  if (audio.byteLength < minBytes) {
    throw new Error(
      diarize
        ? 'Audio clip too short for diarization (need ~1s of speech)'
        : 'Audio clip too short for transcription',
    );
  }

  const form = new FormData();
  const blob = new Blob([audio], { type: mimeType || 'audio/webm' });
  form.append('file', blob, 'utterance.webm');
  form.append('model_id', VOICE_MODELS.stt);
  form.append('timestamps_granularity', 'word');
  form.append('tag_audio_events', 'false');

  if (diarize) {
    form.append('diarize', 'true');
    if (options?.maxSpeakers) {
      form.append('num_speakers', String(Math.min(8, Math.max(2, options.maxSpeakers))));
    }
  }

  if (options?.languageCode) {
    form.append('language_code', options.languageCode);
  }

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsKey() },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Scribe STT failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const data = (await response.json()) as ScribeResponse;
  const rawSegments = diarize
    ? groupWordsIntoSegments(data.words ?? [])
    : [
        {
          speakerId: 'speaker_0',
          speakerLabel: 'Caller 1',
          text: (data.text ?? '').trim(),
        },
      ].filter((s) => s.text);

  const segments = diarize ? dropShortDiarizedSegments(rawSegments) : rawSegments;

  return {
    text: (data.text ?? segments.map((s) => s.text).join(' ')).trim(),
    segments: segments.length
      ? segments
      : [{ speakerId: 'speaker_0', speakerLabel: 'Caller 1', text: data.text?.trim() ?? '' }],
    languageCode: data.language_code ?? 'eng',
    languageProbability: data.language_probability ?? 0,
  };
}

/** Scribe STT with speaker diarization enabled. */
export async function transcribeWithDiarization(
  audio: Buffer,
  mimeType: string,
  options?: Omit<TranscribeOptions, 'diarize'>,
): Promise<DiarizedTranscript> {
  return transcribeSpeech(audio, mimeType, { ...options, diarize: true });
}
