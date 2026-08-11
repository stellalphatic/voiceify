import { useCallback, useEffect, useRef, useState } from 'react';
import { getPersona } from './personas';
import {
  detectLanguage,
  detectLanguageFromAudioMeta,
  normalizeLanguageCode,
  resolveSttLocale,
  toScribeLanguageCode,
  isConfidentLanguageSwitch,
  type LanguageCode,
  type LanguageMode,
} from './language';
import { PcmStreamPlayer } from './pcm-player';
import { consumeVoiceStream } from './stream-client';
import { blobToBase64, UtteranceRecorder } from './utterance-recorder';
import { BARGE_IN_COOLDOWN_MS, BARGE_IN_FINAL_WAIT_MS, INTERRUPT_MIN_CHARS, isLikelyEcho, isInterruptKeyword, shouldTriggerBargeIn } from './interrupt';
import { SCRIBE_DIARIZE_RACE_MS, SCRIBE_STT_RACE_MS, DUPLICATE_UTTERANCE_MS, MIN_UTTERANCE_CHARS, POST_GREETING_GRACE_MS, MIN_DIARIZE_CLIP_MS, MIN_DIARIZE_AUDIO_BYTES, THINKING_HOLD_MS, HOLD_PHRASES, VAD_CONFIRM_WINDOW_MS, VOICE_FETCH_TIMEOUT_MS } from './constants';
import { resolveEndpointDelay } from './endpointing';
import { isLikelySttHallucination } from './stt-guard';
import { ScribeRealtimeSession } from './scribe-realtime-session';
import { VoiceActivityMonitor, type VoiceActivityOptions } from './voice-activity-monitor';
import { getDemoGreeting } from './nova-demo';
import type { CustomAgentConfig } from '@voiceify/shared';

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  speakerId?: string;
  speakerLabel?: string;
  interrupted?: boolean;
}

interface ChatHistoryLine {
  role: 'user' | 'assistant';
  content: string;
}

interface DiarizedSegmentDto {
  speakerId: string;
  speakerLabel: string;
  text: string;
}

function toChatHistory(lines: TranscriptLine[]): ChatHistoryLine[] {
  return lines
    .filter((line) => line.text.trim())
    .map((line) => ({
      role: line.role,
      content:
        line.role === 'assistant' && line.interrupted
          ? `${line.text} [interrupted]`
          : line.text,
    }));
}

function sleep(ms: number): Promise<null> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(null), ms);
  });
}

function buildUserLines(text: string): TranscriptLine[] {
  return [
    {
      role: 'user',
      text,
      speakerId: 'speaker_0',
      speakerLabel: 'Caller 1',
    },
  ];
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const FINAL_LANG_MIN_CHARS = 12;

function holdPhraseForLanguage(lang: LanguageCode): string {
  return lang === 'ur' ? HOLD_PHRASES.ur : HOLD_PHRASES.en;
}

function greetingForMode(
  persona: ReturnType<typeof getPersona>,
  mode: LanguageMode,
): string {
  const demoGreeting = getDemoGreeting(persona.id, mode);
  if (demoGreeting) return demoGreeting;
  if (mode === 'ur') return persona.greetingUr;
  if (mode === 'auto') return persona.greetingAuto;
  return persona.greeting;
}

function languageForRequest(
  mode: LanguageMode,
  lastDetected: LanguageCode,
  userText?: string,
): LanguageCode | undefined {
  if (mode === 'en') return 'en';
  if (mode === 'ur') return 'ur';
  if (userText?.trim()) {
    const trimmed = userText.trim();
    if (trimmed.length < FINAL_LANG_MIN_CHARS) {
      return normalizeLanguageCode(lastDetected);
    }
    return detectLanguage(trimmed);
  }
  return normalizeLanguageCode(lastDetected);
}

export interface UseVoiceAgentOptions {
  agentConfig?: CustomAgentConfig | null;
  customGreeting?: string;
  agentName?: string;
  /** Stable id for auto-restart when switching agents (not greeting text). */
  sessionId?: string;
  /** Start listening automatically on mount and when persona/agent changes. */
  autoStart?: boolean;
  /** When set with agentServerId, sandbox uses the metered org turn pipeline. */
  orgId?: string | null;
  agentServerId?: string | null;
  /**
   * Language the first turn is transcribed as. The browser recognizer handles
   * one locale at a time, so an agent configured for a non-English language
   * must not start on en-US or its first utterance comes back as garbage.
   */
  initialLanguage?: LanguageCode;
}

export function useVoiceAgent(
  personaId: string,
  languageMode: LanguageMode = 'auto',
  options?: UseVoiceAgentOptions,
) {
  const persona = getPersona(personaId);
  const initialLanguage = options?.initialLanguage ?? 'en';
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [messages, setMessages] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(initialLanguage);
  const [diarizationEnabled, setDiarizationEnabled] = useState(false);
  const [scribeSttEnabled, setScribeSttEnabled] = useState(false);
  const [scribeRealtimeEnabled, setScribeRealtimeEnabled] = useState(false);
  const [groqEnabled, setGroqEnabled] = useState(false);
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [interruptCount, setInterruptCount] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sttFallbackWarning, setSttFallbackWarning] = useState<string | null>(null);

  const historyRef = useRef<TranscriptLine[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const utteranceRecorderRef = useRef<UtteranceRecorder | null>(null);
  const diarizationRef = useRef(false);
  const scribeSttRef = useRef(false);
  const scribeRealtimeRef = useRef(false);
  const scribeSessionRef = useRef<ScribeRealtimeSession | null>(null);
  const playerRef = useRef<PcmStreamPlayer | null>(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const processingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const holdAbortRef = useRef<AbortController | null>(null);
  const turnIdRef = useRef(0);
  const bargeInCooldownRef = useRef(0);
  const bargeInAwaitingFinalRef = useRef(false);
  const bargeInAwaitingFinalTimerRef = useRef<number | null>(null);
  const vadDuckedRef = useRef(false);
  const vadDuckTimerRef = useRef<number | null>(null);
  /** Turn whose mic energy proved to be echo rather than a real interruption. */
  const vadUnreliableTurnRef = useRef(-1);
  const recognitionRestartRef = useRef<number | null>(null);
  const vadMonitorRef = useRef<VoiceActivityMonitor | null>(null);
  const lastFinalRef = useRef({ text: '', at: 0 });
  const postGreetingGraceUntilRef = useRef(0);
  const lastLanguageRef = useRef<LanguageCode>(initialLanguage);
  const lastSttLocaleRef = useRef(resolveSttLocale(languageMode, initialLanguage));
  const languageModeRef = useRef<LanguageMode>(languageMode);
  const maintainRecognitionLoopRef = useRef<() => void>(() => {});
  const agentConfigRef = useRef(options?.agentConfig);
  const customGreetingRef = useRef(options?.customGreeting);
  const agentNameRef = useRef(options?.agentName);
  const orgIdRef = useRef(options?.orgId ?? null);
  const agentServerIdRef = useRef(options?.agentServerId ?? null);
  const conversationIdRef = useRef<string | null>(null);
  const autoStartAllowedRef = useRef(true);

  useEffect(() => {
    agentConfigRef.current = options?.agentConfig;
    customGreetingRef.current = options?.customGreeting;
    agentNameRef.current = options?.agentName;
    orgIdRef.current = options?.orgId ?? null;
    agentServerIdRef.current = options?.agentServerId ?? null;
  }, [
    options?.agentConfig,
    options?.customGreeting,
    options?.agentName,
    options?.orgId,
    options?.agentServerId,
  ]);

  const displayName = useCallback(
    () => agentNameRef.current?.trim() || persona.name,
    [persona.name],
  );

  const voiceApiBody = useCallback(
    (base: Record<string, unknown>) => {
      const cfg = agentConfigRef.current;
      return {
        ...base,
        ...(cfg?.name ? { agentConfig: cfg } : {}),
      };
    },
    [],
  );

  /** Prefer authenticated org turn (tools/knowledge/packs); fall back to legacy /respond. */
  const fetchVoicePipeline = useCallback(
    async (
      payload: Record<string, unknown>,
      signal: AbortSignal,
    ): Promise<Response> => {
      const orgId = orgIdRef.current;
      const agentServerId = agentServerIdRef.current;
      const ttsOnly = payload.mode === 'tts_only';

      if (orgId && agentServerId) {
        const res = await fetch(`/api/voice/${orgId}/agents/${agentServerId}/turn`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: payload.message,
            history: payload.history ?? [],
            channel: 'sandbox',
            ttsOnly: Boolean(ttsOnly),
            ...(conversationIdRef.current
              ? { conversationId: conversationIdRef.current }
              : {}),
          }),
          signal,
        });
        const convId = res.headers.get('x-conversation-id');
        if (convId) conversationIdRef.current = convId;
        return res;
      }

      return fetch('/api/voice/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceApiBody(payload)),
        signal,
      });
    },
    [voiceApiBody],
  );

  useEffect(() => {
    languageModeRef.current = languageMode;
    if (languageMode === 'en') {
      lastLanguageRef.current = 'en';
      lastSttLocaleRef.current = resolveSttLocale('en', 'en');
      setActiveLanguage('en');
    } else if (languageMode === 'ur') {
      lastLanguageRef.current = 'ur';
      lastSttLocaleRef.current = resolveSttLocale('ur', 'ur');
      setActiveLanguage('ur');
    } else {
      lastSttLocaleRef.current = resolveSttLocale('auto', lastLanguageRef.current);
    }
  }, [languageMode]);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) playerRef.current = new PcmStreamPlayer();
    return playerRef.current;
  }, []);

  const stopPlaybackOnly = useCallback(() => {
    holdAbortRef.current?.abort();
    holdAbortRef.current = null;
    /* Soft clear — keep AudioContext so reply TTS is not blocked by autoplay policy. */
    playerRef.current?.reset();
    speakingRef.current = false;
  }, []);

  const stopAudio = useCallback(() => {
    holdAbortRef.current?.abort();
    holdAbortRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    speakingRef.current = false;
  }, []);

  /** Interrupt current speech without destroying the AudioContext (barge-in / turn handoff). */
  const softInterruptPlayback = useCallback(() => {
    holdAbortRef.current?.abort();
    holdAbortRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    playerRef.current?.reset();
    speakingRef.current = false;
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRestartRef.current != null) {
      window.clearTimeout(recognitionRestartRef.current);
      recognitionRestartRef.current = null;
    }
    scribeSessionRef.current?.close();
    scribeSessionRef.current = null;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const applyDetectedLanguage = useCallback(
    (
      code: LanguageCode,
      options?: { sampleText?: string; force?: boolean },
    ) => {
      if (languageModeRef.current !== 'auto' || !activeRef.current) return;

      const normalized = normalizeLanguageCode(code);
      const sample = options?.sampleText ?? '';
      if (
        !options?.force &&
        !isConfidentLanguageSwitch(sample, normalized, lastLanguageRef.current)
      ) {
        return;
      }

      const nextLocale = resolveSttLocale('auto', normalized);
      const prevLocale = lastSttLocaleRef.current;

      lastLanguageRef.current = normalized;
      setActiveLanguage(normalized);

      if (nextLocale === prevLocale) return;

      lastSttLocaleRef.current = nextLocale;
      stopRecognition();
      window.setTimeout(() => {
        if (activeRef.current) maintainRecognitionLoopRef.current();
      }, 140);
    },
    [stopRecognition],
  );

  const releaseRecorder = useCallback(() => {
    utteranceRecorderRef.current?.release();
    utteranceRecorderRef.current = null;
  }, []);

  const getLastAgentText = useCallback((): string => {
    for (let i = historyRef.current.length - 1; i >= 0; i -= 1) {
      if (historyRef.current[i].role === 'assistant') return historyRef.current[i].text;
    }
    return '';
  }, []);

  // Only the utterance currently coming out of the speakers can echo. Matching
  // against older turns rejects legitimate replies that reuse the agent's words.
  const getRecentAgentText = useCallback((): string => {
    return historyRef.current
      .filter((line) => line.role === 'assistant')
      .slice(-1)
      .map((line) => line.text)
      .join(' ');
  }, []);

  const markLastAssistantInterrupted = useCallback(() => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i -= 1) {
        if (copy[i].role === 'assistant' && !copy[i].interrupted) {
          copy[i] = { ...copy[i], interrupted: true };
          break;
        }
      }
      return copy;
    });

    const hist = historyRef.current;
    for (let i = hist.length - 1; i >= 0; i -= 1) {
      if (hist[i].role === 'assistant' && !hist[i].interrupted) {
        hist[i] = { ...hist[i], interrupted: true };
        break;
      }
    }
  }, []);

  const handleBargeInRef = useRef<() => void>(() => {});

  const stopVadMonitor = useCallback(() => {
    vadMonitorRef.current?.stop();
  }, []);

  const restartRecorderForInterrupt = useCallback(async () => {
    try {
      await utteranceRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (activeRef.current) {
      await utteranceRecorderRef.current?.start().catch(() => null);
    }
  }, []);

  const clearBargeInAwaitingFinal = useCallback(() => {
    bargeInAwaitingFinalRef.current = false;
    if (bargeInAwaitingFinalTimerRef.current != null) {
      window.clearTimeout(bargeInAwaitingFinalTimerRef.current);
      bargeInAwaitingFinalTimerRef.current = null;
    }
    /* Reached when mic energy was rejected as echo, so restore the agent level. */
    if (vadDuckTimerRef.current != null) {
      window.clearTimeout(vadDuckTimerRef.current);
      vadDuckTimerRef.current = null;
    }
    if (vadDuckedRef.current) {
      vadDuckedRef.current = false;
      playerRef.current?.unduck();
    }
  }, []);

  const getVadOptions = useCallback((): VoiceActivityOptions => {
    const inGrace = Date.now() < postGreetingGraceUntilRef.current;
    if (speakingRef.current || thinkingRef.current) {
      // Speakers are live, so residual echo survives imperfect AEC. Demand a
      // loud, sustained signal (~250ms) before cutting the agent off, otherwise
      // the agent's own voice barges in on itself.
      return { threshold: 0.12, framesRequired: 15 };
    }
    return inGrace
      ? { threshold: 0.05, framesRequired: 5 }
      : { threshold: 0.032, framesRequired: 3 };
  }, []);

  const handleBargeIn = useCallback((_fromText?: string) => {
    if (!speakingRef.current && !thinkingRef.current) return;
    if (Date.now() - bargeInCooldownRef.current < BARGE_IN_COOLDOWN_MS) return;

    bargeInCooldownRef.current = Date.now();
    turnIdRef.current += 1;
    // softInterruptPlayback resets the player, which restores gain, so only the
    // duck bookkeeping needs clearing here.
    if (vadDuckTimerRef.current != null) {
      window.clearTimeout(vadDuckTimerRef.current);
      vadDuckTimerRef.current = null;
    }
    vadDuckedRef.current = false;
    softInterruptPlayback();
    speakingRef.current = false;
    thinkingRef.current = false;
    processingRef.current = false;
    stopVadMonitor();

    if (getLastAgentText()) markLastAssistantInterrupted();

    if (!scribeRealtimeRef.current) {
      void restartRecorderForInterrupt();
    }

    bargeInAwaitingFinalRef.current = true;
    if (bargeInAwaitingFinalTimerRef.current != null) {
      window.clearTimeout(bargeInAwaitingFinalTimerRef.current);
    }
    bargeInAwaitingFinalTimerRef.current = window.setTimeout(() => {
      bargeInAwaitingFinalRef.current = false;
      bargeInAwaitingFinalTimerRef.current = null;
    }, BARGE_IN_FINAL_WAIT_MS);

    setInterruptCount((count) => count + 1);
    setStatus('listening');
  }, [
    getLastAgentText,
    markLastAssistantInterrupted,
    restartRecorderForInterrupt,
    softInterruptPlayback,
    stopVadMonitor,
  ]);

  handleBargeInRef.current = handleBargeIn;

  /**
   * Mic energy while the speakers are live is not proof the user is talking —
   * imperfect AEC leaks the agent's own voice back in. Committing a barge-in
   * here bumped the turn id, which made every remaining audio event of the
   * reply get dropped, so one echo blip silenced the rest of the answer and
   * produced the speak/mute/speak stutter.
   *
   * Instead this only ducks the output and arms a confirmation window. The
   * user gets instant feedback that they were heard, while the reply keeps
   * streaming. Only STT seeing real, non-echo words commits the interruption
   * (see shouldTriggerBargeIn callers); if nothing is confirmed the level is
   * restored and the agent finishes its sentence.
   */
  const handleVadEnergy = useCallback(() => {
    if (!speakingRef.current && !thinkingRef.current) return;
    if (vadDuckedRef.current) return;
    /*
     * A duck that already expired unconfirmed on this turn means the energy is
     * this agent's own output leaking past AEC. Reacting again would wobble the
     * volume once a second for the rest of the reply, so leave it alone —
     * genuine interruptions still land through the STT path.
     */
    if (vadUnreliableTurnRef.current === turnIdRef.current) return;

    vadDuckedRef.current = true;
    playerRef.current?.duck();

    if (vadDuckTimerRef.current != null) window.clearTimeout(vadDuckTimerRef.current);
    vadDuckTimerRef.current = window.setTimeout(() => {
      vadDuckTimerRef.current = null;
      vadDuckedRef.current = false;
      vadUnreliableTurnRef.current = turnIdRef.current;
      if (speakingRef.current || thinkingRef.current) playerRef.current?.unduck();
    }, VAD_CONFIRM_WINDOW_MS);
  }, []);

  const syncVadMonitor = useCallback(() => {
    if (!activeRef.current || (!speakingRef.current && !thinkingRef.current)) {
      stopVadMonitor();
      return;
    }

    const track = scribeSessionRef.current?.getMediaStreamTrack();
    const stream = track
      ? new MediaStream([track])
      : utteranceRecorderRef.current?.getStream();
    if (!stream) return;

    if (!vadMonitorRef.current) vadMonitorRef.current = new VoiceActivityMonitor();
    vadMonitorRef.current.start(
      stream,
      () => {
        if (speakingRef.current || thinkingRef.current) handleVadEnergy();
      },
      getVadOptions(),
    );
  }, [getVadOptions, handleVadEnergy, stopVadMonitor]);

  const replaceLastUserTurn = useCallback((lines: TranscriptLine[]) => {
    const hist = historyRef.current;
    let userCount = 0;
    for (let i = hist.length - 1; i >= 0; i -= 1) {
      if (hist[i].role === 'user') userCount += 1;
      else break;
    }
    if (userCount === 0) return;

    historyRef.current = [...hist.slice(0, hist.length - userCount), ...lines];

    setMessages((prev) => {
      const copy = [...prev];
      let removed = 0;
      for (let i = copy.length - 1; i >= 0 && removed < userCount; i -= 1) {
        if (copy[i].role === 'user') {
          copy.splice(i, 1);
          removed += 1;
        } else break;
      }
      return [...copy, ...lines];
    });
  }, []);

  const trackSpeakers = useCallback((lines: TranscriptLine[]) => {
    const ids = lines
      .map((line) => line.speakerId)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) return;
    setActiveSpeakers((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const transcribeUtterance = useCallback(
    async (
      audio: { blob: Blob; mimeType: string },
      fallbackText: string,
      options?: { diarize?: boolean },
    ): Promise<{ lines: TranscriptLine[]; llmText: string }> => {
      const b64 = await blobToBase64(audio.blob);
      const scribeLang = toScribeLanguageCode(
        lastLanguageRef.current,
        languageModeRef.current,
      );
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: b64,
          mimeType: audio.mimeType,
          maxSpeakers: 4,
          diarize: options?.diarize ?? false,
          languageCode: scribeLang,
        }),
      });

      if (!res.ok) throw new Error('Scribe transcription failed');

      const data = (await res.json()) as {
        text: string;
        segments: DiarizedSegmentDto[];
        languageCode?: string;
        languageProbability?: number;
      };

      const segments = (data.segments ?? []).filter((segment) => segment.text?.trim());
      if (!segments.length) throw new Error('No transcription segments');

      const lines: TranscriptLine[] = segments.map((segment) => ({
        role: 'user',
        text: segment.text.trim(),
        speakerId: segment.speakerId,
        speakerLabel: segment.speakerLabel,
      }));

      const llmText =
        options?.diarize && lines.length > 1
          ? lines.map((line) => `[${line.speakerLabel}]: ${line.text}`).join('\n')
          : (data.text?.trim() || lines.map((line) => line.text).join(' '));

      const detected = detectLanguageFromAudioMeta(
        data.languageCode,
        data.languageProbability,
        data.text || fallbackText,
      );
      applyDetectedLanguage(detected, {
        sampleText: data.text || fallbackText,
        force: (data.languageProbability ?? 0) >= 0.5,
      });

      return { lines, llmText };
    },
    [applyDetectedLanguage],
  );

  const resolveUserTurn = useCallback(
    async (
      fallback: string,
      audioCapture: { blob: Blob; mimeType: string; durationMs: number } | null,
    ): Promise<{ lines: TranscriptLine[]; llmText: string }> => {
      const provisional = buildUserLines(fallback);
      const llmText = fallback;
      applyDetectedLanguage(detectLanguage(fallback), { sampleText: fallback });

      if (!scribeSttRef.current || !audioCapture || scribeRealtimeRef.current) {
        return { lines: provisional, llmText };
      }

      const useDiarize = diarizationRef.current;
      const canDiarizeClip =
        useDiarize &&
        audioCapture.durationMs >= MIN_DIARIZE_CLIP_MS &&
        audioCapture.blob.size >= MIN_DIARIZE_AUDIO_BYTES;
      const raceMs = canDiarizeClip ? SCRIBE_DIARIZE_RACE_MS : SCRIBE_STT_RACE_MS;

      if (raceMs > 0) {
        const raced = await Promise.race([
          transcribeUtterance(audioCapture, fallback, { diarize: canDiarizeClip }),
          sleep(raceMs),
        ]);
        if (raced) return { lines: raced.lines, llmText: raced.llmText };
      }

      const refineTurn = turnIdRef.current;
      void transcribeUtterance(audioCapture, fallback, { diarize: canDiarizeClip })
        .then((refined) => {
          if (!activeRef.current || refineTurn !== turnIdRef.current) return;
          if (speakingRef.current || thinkingRef.current) return;
          replaceLastUserTurn(refined.lines);
          trackSpeakers(refined.lines);
          const refinedLang = detectLanguage(refined.lines.map((l) => l.text).join(' '));
          applyDetectedLanguage(refinedLang, {
            sampleText: refined.lines.map((l) => l.text).join(' '),
            force: true,
          });
        })
        .catch(() => undefined);

      return { lines: provisional, llmText };
    },
    [applyDetectedLanguage, replaceLastUserTurn, trackSpeakers, transcribeUtterance],
  );

  /** Single streaming request: LLM + PCM TTS piped in one round-trip. */
  const speakPipeline = useCallback(
    async (text: string, measureFrom?: number): Promise<number | null> => {
      const turnId = turnIdRef.current;
      softInterruptPlayback();
      speakingRef.current = true;
      setStatus('speaking');
      syncVadMonitor();

      const player = getPlayer();
      player.reset();
      const controller = new AbortController();
      abortRef.current = controller;
      const fetchTimer = window.setTimeout(() => controller.abort(), VOICE_FETCH_TIMEOUT_MS);

      let ttfa: number | null = null;
      const pipelineStart = performance.now();

      let res: Response;
      try {
        res = await fetchVoicePipeline(
          {
            message: text,
            personaId: persona.id,
            history: toChatHistory(historyRef.current),
            mode: 'tts_only',
            language: languageForRequest(
              languageModeRef.current,
              lastLanguageRef.current,
              text,
            ),
          },
          controller.signal,
        );
      } catch (err: unknown) {
        window.clearTimeout(fetchTimer);
        speakingRef.current = false;
        if (err instanceof Error && err.name === 'AbortError') return null;
        throw err;
      }
      window.clearTimeout(fetchTimer);

      if (!res.ok) {
        speakingRef.current = false;
        const err = await res.json().catch(() => ({ error: 'Voice pipeline failed' }));
        throw new Error(err.error || 'Voice pipeline failed');
      }

      try {
        await consumeVoiceStream(
          res,
          async (event) => {
            if (turnId !== turnIdRef.current) return;
            if (event.type === 'text' && event.language && languageModeRef.current === 'auto') {
              applyDetectedLanguage(event.language, { force: true });
            }
            if (event.type === 'audio') {
              if (!speakingRef.current) {
                speakingRef.current = true;
                syncVadMonitor();
              }
              await player.appendBase64Pcm(event.data, () => {
                if (ttfa === null) {
                  const base = measureFrom ?? pipelineStart;
                  ttfa = Math.round(performance.now() - base);
                  setLatencyMs(ttfa);
                }
              });
            }
            if (event.type === 'ttfa') {
              ttfa = event.ms;
              if (measureFrom) {
                setLatencyMs(Math.round(performance.now() - measureFrom));
              } else {
                setLatencyMs(event.ms);
              }
            }
            if (event.type === 'done' && event.ttfaMs != null && measureFrom == null) {
              setLatencyMs(event.ttfaMs);
            }
          },
          controller.signal,
        );

        if (turnId !== turnIdRef.current) return null;
        await player.drain();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return null;
        throw err;
      }

      if (turnId !== turnIdRef.current) return null;
      speakingRef.current = false;
      stopVadMonitor();
      if (activeRef.current && !thinkingRef.current) {
        setStatus('listening');
      }
      return ttfa;
    },
    [
      applyDetectedLanguage,
      fetchVoicePipeline,
      getPlayer,
      persona.id,
      softInterruptPlayback,
      stopVadMonitor,
      syncVadMonitor,
    ],
  );

  /** Brief hold audio while LLM thinks — never aborts the main turn fetch/stream. */
  const playThinkingHold = useCallback(
    async (forTurnId: number): Promise<void> => {
      if (forTurnId !== turnIdRef.current || !thinkingRef.current) return;

      const holdController = new AbortController();
      holdAbortRef.current = holdController;
      const phrase = holdPhraseForLanguage(lastLanguageRef.current);

      try {
        const res = await fetchVoicePipeline(
          {
            message: phrase,
            personaId: persona.id,
            history: toChatHistory(historyRef.current),
            mode: 'tts_only',
            language: languageForRequest(
              languageModeRef.current,
              lastLanguageRef.current,
            ),
          },
          holdController.signal,
        );
        if (!res.ok || forTurnId !== turnIdRef.current) return;

        const player = getPlayer();
        await consumeVoiceStream(
          res,
          async (event) => {
            // Turn id alone is not enough: cancelling the hold happens within
            // the same turn, so without the abort check the hold phrase keeps
            // appending into the shared player and cuts across the real reply.
            if (forTurnId !== turnIdRef.current || holdController.signal.aborted) return;
            if (event.type === 'audio') {
              speakingRef.current = true;
              syncVadMonitor();
              await player.appendBase64Pcm(event.data);
            }
          },
          holdController.signal,
        );
        if (forTurnId === turnIdRef.current && !holdController.signal.aborted) {
          await player.drain().catch(() => undefined);
        }
      } catch {
        /* cancelled when main reply arrives */
      } finally {
        if (holdAbortRef.current === holdController) holdAbortRef.current = null;
      }
    },
    [fetchVoicePipeline, getPlayer, persona.id, syncVadMonitor],
  );

  const runTurn = useCallback(
    async (
      userText: string,
      speechEndAt: number,
      historyBeforeTurn: TranscriptLine[],
    ): Promise<void> => {
      const turnId = ++turnIdRef.current;
      thinkingRef.current = true;
      setStatus('thinking');
      syncVadMonitor();

      let holdTimer: number | null = window.setTimeout(() => {
        if (turnId !== turnIdRef.current || !thinkingRef.current) return;
        void playThinkingHold(turnId);
      }, THINKING_HOLD_MS);

      const cancelHoldPlayback = () => {
        if (holdTimer != null) {
          window.clearTimeout(holdTimer);
          holdTimer = null;
        }
        holdAbortRef.current?.abort();
        holdAbortRef.current = null;
      };

      const player = getPlayer();
      player.reset();

      const controller = new AbortController();
      abortRef.current = controller;
      let timedOut = false;
      const operationTimer = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, VOICE_FETCH_TIMEOUT_MS);

      let replyText = '';
      let ttfaSet = false;

      let res: Response;
      try {
        res = await fetchVoicePipeline(
          {
            message: userText,
            personaId: persona.id,
            history: toChatHistory(historyBeforeTurn),
            language: languageForRequest(
              languageModeRef.current,
              lastLanguageRef.current,
              userText,
            ),
          },
          controller.signal,
        );
      } catch (err: unknown) {
        cancelHoldPlayback();
        thinkingRef.current = false;
        speakingRef.current = false;
        if (err instanceof Error && err.name === 'AbortError') {
          if (turnId !== turnIdRef.current) return;
          if (timedOut) {
            throw new Error('Voice request timed out — check server and API keys');
          }
          return;
        }
        throw err;
      }

      cancelHoldPlayback();
      stopPlaybackOnly();

      if (!res.ok) {
        thinkingRef.current = false;
        speakingRef.current = false;
        const err = await res.json().catch(() => ({ error: 'Voice pipeline failed' }));
        throw new Error(err.error || 'Voice pipeline failed');
      }

      try {
        await consumeVoiceStream(
          res,
          async (event) => {
            if (turnId !== turnIdRef.current) return;
            cancelHoldPlayback();
            if (event.type === 'text') {
              replyText = event.text;
              if (event.language && languageModeRef.current === 'auto') {
                applyDetectedLanguage(event.language, { force: true });
              }
              const agentLine: TranscriptLine = {
                role: 'assistant',
                text: replyText,
                speakerId: 'agent',
                speakerLabel: displayName(),
              };
              historyRef.current = [...historyRef.current, agentLine];
              setMessages((prev) => [...prev, agentLine]);
              thinkingRef.current = false;
              speakingRef.current = true;
              setStatus('speaking');
              syncVadMonitor();
            }
            if (event.type === 'audio') {
              if (!speakingRef.current) {
                speakingRef.current = true;
                syncVadMonitor();
              }
              await player.appendBase64Pcm(event.data, () => {
                if (!ttfaSet) {
                  ttfaSet = true;
                  setLatencyMs(Math.round(performance.now() - speechEndAt));
                }
              });
            }
            if (event.type === 'ttfa' && !ttfaSet) {
              ttfaSet = true;
              setLatencyMs(Math.round(performance.now() - speechEndAt));
            }
          },
          controller.signal,
        );

        if (turnId !== turnIdRef.current) return;
        thinkingRef.current = false;
        await player.drain();
      } catch (err: unknown) {
        thinkingRef.current = false;
        speakingRef.current = false;
        stopVadMonitor();
        cancelHoldPlayback();
        if (err instanceof Error && err.name === 'AbortError') {
          if (turnId !== turnIdRef.current) return;
          if (timedOut) {
            throw new Error('Voice request timed out — check server and API keys');
          }
          return;
        }
        throw err;
      } finally {
        window.clearTimeout(operationTimer);
      }

      if (turnId !== turnIdRef.current) return;
      speakingRef.current = false;
      stopVadMonitor();
      if (activeRef.current && !thinkingRef.current) {
        setStatus('listening');
      }
    },
    [
      applyDetectedLanguage,
      displayName,
      fetchVoicePipeline,
      getPlayer,
      persona.id,
      playThinkingHold,
      stopPlaybackOnly,
      stopVadMonitor,
      syncVadMonitor,
    ],
  );

  const processUserMessage = useCallback(
    async (
      transcript: string,
      speechEndAt: number,
      audioCapture: { blob: Blob; mimeType: string; durationMs: number } | null,
    ) => {
      const fallback = transcript.trim();
      if (!fallback || !activeRef.current) return;

      const { lines: userLines, llmText } = await resolveUserTurn(fallback, audioCapture);

      const priorHistory = historyRef.current;
      historyRef.current = [...priorHistory, ...userLines];
      setMessages((prev) => [...prev, ...userLines]);
      trackSpeakers(userLines);

      try {
        await runTurn(llmText, speechEndAt, priorHistory);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Turn failed';
        setError(msg);
        if (activeRef.current) {
          setStatus('listening');
        } else {
          setStatus('error');
        }
      }
    },
    [resolveUserTurn, runTurn, trackSpeakers],
  );

  const processFinalUtteranceRef = useRef(processUserMessage);
  processFinalUtteranceRef.current = processUserMessage;

  const utteranceDebounceRef = useRef<number | null>(null);
  const pendingUtteranceRef = useRef('');

  const processFinalUtterance = useCallback((transcript: string) => {
    const fallback = transcript.trim();
    if (!fallback || fallback.length < MIN_UTTERANCE_CHARS || !activeRef.current) return;
    if (isLikelySttHallucination(fallback)) return;

    // Browsers emit several final results per sentence. Accumulate them —
    // overwriting kept only the last fragment and silently dropped the rest.
    const pending = pendingUtteranceRef.current;
    pendingUtteranceRef.current = pending ? `${pending} ${fallback}` : fallback;
    if (utteranceDebounceRef.current != null) {
      window.clearTimeout(utteranceDebounceRef.current);
    }

    /* Wait on the shape of the sentence, not a fixed window. */
    const debounceMs = resolveEndpointDelay(pendingUtteranceRef.current);

    utteranceDebounceRef.current = window.setTimeout(() => {
      utteranceDebounceRef.current = null;
      const text = pendingUtteranceRef.current.trim();
      pendingUtteranceRef.current = '';
      if (
        !text ||
        text.length < MIN_UTTERANCE_CHARS ||
        !activeRef.current ||
        processingRef.current
      ) {
        return;
      }
      if (Date.now() < postGreetingGraceUntilRef.current && !bargeInAwaitingFinalRef.current) return;
      if (speakingRef.current || thinkingRef.current) return;
      if (!isInterruptKeyword(text) && isLikelyEcho(text, getRecentAgentText())) {
        clearBargeInAwaitingFinal();
        return;
      }

      if (
        lastFinalRef.current.text === text &&
        Date.now() - lastFinalRef.current.at < DUPLICATE_UTTERANCE_MS
      ) {
        return;
      }
      lastFinalRef.current = { text, at: Date.now() };

      processingRef.current = true;
      clearBargeInAwaitingFinal();
      const speechEndAt = performance.now();

      void (async () => {
        try {
          const audioCapture = await utteranceRecorderRef.current?.stop().catch(() => null);
          await processFinalUtteranceRef.current(text, speechEndAt, audioCapture ?? null);
        } finally {
          processingRef.current = false;
          if (activeRef.current) {
            void utteranceRecorderRef.current?.start().catch(() => null);
          }
        }
      })();
    }, debounceMs);
  }, [clearBargeInAwaitingFinal, getRecentAgentText]);

  const submitUserSpeech = useCallback(
    (final: string) => {
      const fallback = final.trim();
      if (!fallback || fallback.length < MIN_UTTERANCE_CHARS || !activeRef.current) return;
      if (isLikelySttHallucination(fallback)) return;

      const agentText = getRecentAgentText();
      if (speakingRef.current || thinkingRef.current) {
        if (shouldTriggerBargeIn(fallback, agentText)) {
          handleBargeIn(fallback);
        }
        if (speakingRef.current || thinkingRef.current) return;
      }
      if (Date.now() < postGreetingGraceUntilRef.current && !bargeInAwaitingFinalRef.current) return;
      // Always echo-filter, including right after a barge-in. Exempting that
      // window let the agent's own transcript be submitted as a user turn,
      // which restarted the agent and produced an endless speak/mute loop.
      if (!isInterruptKeyword(fallback) && isLikelyEcho(fallback, agentText)) {
        clearBargeInAwaitingFinal();
        return;
      }
      if (processingRef.current) return;

      if (
        lastFinalRef.current.text === fallback &&
        Date.now() - lastFinalRef.current.at < DUPLICATE_UTTERANCE_MS
      ) {
        return;
      }
      lastFinalRef.current = { text: fallback, at: Date.now() };

      processingRef.current = true;
      clearBargeInAwaitingFinal();
      const speechEndAt = performance.now();

      void (async () => {
        try {
          let audioCapture: { blob: Blob; mimeType: string; durationMs: number } | null = null;
          if (!scribeRealtimeRef.current && utteranceRecorderRef.current) {
            audioCapture = await utteranceRecorderRef.current.stop().catch(() => null);
          }
          await processFinalUtteranceRef.current(fallback, speechEndAt, audioCapture);
        } finally {
          processingRef.current = false;
          if (activeRef.current && !scribeRealtimeRef.current) {
            void utteranceRecorderRef.current?.start().catch(() => null);
          }
        }
      })();
    },
    [clearBargeInAwaitingFinal, getRecentAgentText, handleBargeIn],
  );

  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setError('Speech recognition is not supported. Please use Google Chrome.');
      setStatus('error');
      return;
    }

    if (recognitionRef.current) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    const sttLocale = resolveSttLocale(languageModeRef.current, lastLanguageRef.current);
    recognition.lang = sttLocale;
    lastSttLocaleRef.current = sttLocale;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interimBuffer = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalTranscript += text;
        else interimBuffer += text;
      }

      const interim = interimBuffer.trim();
      const final = finalTranscript.trim();
      const agentText = getRecentAgentText();

      if (interim) setInterimTranscript(interim);
      else if (final) setInterimTranscript('');

      if (languageModeRef.current === 'auto' && final.length >= FINAL_LANG_MIN_CHARS) {
        applyDetectedLanguage(detectLanguage(final), { sampleText: final });
      }

      let bargeInThisEvent = false;
      if (speakingRef.current || thinkingRef.current) {
        const candidate = interim || final;
        if (shouldTriggerBargeIn(candidate, agentText)) {
          handleBargeIn(candidate);
          bargeInThisEvent = true;
        }
      }

      if (final && activeRef.current && !processingRef.current) {
        if (isLikelySttHallucination(final)) return;
        if (speakingRef.current || thinkingRef.current) {
          if (!bargeInThisEvent && shouldTriggerBargeIn(final, agentText)) {
            handleBargeIn(final);
          }
          if (speakingRef.current || thinkingRef.current) return;
        }
        if (Date.now() < postGreetingGraceUntilRef.current && !bargeInAwaitingFinalRef.current) return;
        if (isLikelyEcho(final, agentText) && !bargeInAwaitingFinalRef.current) return;
        processFinalUtterance(final);
      } else if (
        bargeInAwaitingFinalRef.current &&
        interim &&
        interim.length >= FINAL_LANG_MIN_CHARS &&
        !processingRef.current &&
        !speakingRef.current &&
        !thinkingRef.current
      ) {
        if (!isLikelyEcho(interim, agentText)) {
          processFinalUtterance(interim);
        }
      }
    };

    recognition.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      setError(`Microphone error: ${ev.error}`);
      setStatus('error');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!activeRef.current) return;

      if (recognitionRestartRef.current) {
        window.clearTimeout(recognitionRestartRef.current);
      }
      recognitionRestartRef.current = window.setTimeout(() => {
        recognitionRestartRef.current = null;
        maintainRecognitionLoop();
      }, 120);
    };

    if (!utteranceRecorderRef.current) {
      utteranceRecorderRef.current = new UtteranceRecorder();
    }

    void utteranceRecorderRef.current.start().catch(() => null);

    setError(null);
    if (!speakingRef.current && !thinkingRef.current) {
      setStatus('listening');
    }

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [applyDetectedLanguage, getRecentAgentText, handleBargeIn, processFinalUtterance]);

  const maintainRecognitionLoop = useCallback(() => {
    if (!activeRef.current) return;

    if (scribeRealtimeRef.current) {
      if (scribeSessionRef.current?.isActive()) return;

      const session = new ScribeRealtimeSession();
      scribeSessionRef.current = session;

      void session
        .start({
          languageCode: toScribeLanguageCode(
            lastLanguageRef.current,
            languageModeRef.current,
          ),
          callbacks: {
            onPartial: (interim) => {
              const agentText = getRecentAgentText();
              setInterimTranscript(interim);
              const agentBusy = speakingRef.current || thinkingRef.current;
              if (agentBusy) {
                if (
                  isInterruptKeyword(interim) ||
                  shouldTriggerBargeIn(interim, agentText)
                ) {
                  handleBargeIn(interim);
                }
              } else if (
                bargeInAwaitingFinalRef.current &&
                interim.length >= INTERRUPT_MIN_CHARS &&
                !processingRef.current &&
                !agentBusy &&
                (isInterruptKeyword(interim) || !isLikelyEcho(interim, agentText))
              ) {
                submitUserSpeech(interim);
              }
            },
            onCommitted: (final) => {
              setInterimTranscript('');
              if (languageModeRef.current === 'auto' && final.length >= FINAL_LANG_MIN_CHARS) {
                applyDetectedLanguage(detectLanguage(final), { sampleText: final });
              }
              submitUserSpeech(final);
            },
            onError: () => {
              if (!activeRef.current) return;
              session.close();
              scribeSessionRef.current = null;
              scribeRealtimeRef.current = false;
              setScribeRealtimeEnabled(false);
              setSttFallbackWarning('Scribe Realtime unavailable — using browser speech recognition.');
              startBrowserRecognition();
            },
            onOpen: () => {
              setError(null);
              if (!speakingRef.current && !thinkingRef.current) {
                setStatus('listening');
              }
            },
          },
        })
        .catch(() => {
          scribeSessionRef.current = null;
          scribeRealtimeRef.current = false;
          setScribeRealtimeEnabled(false);
          setSttFallbackWarning('Scribe Realtime unavailable — using browser speech recognition.');
          startBrowserRecognition();
        });
      return;
    }

    startBrowserRecognition();
  }, [
    applyDetectedLanguage,
    getRecentAgentText,
    handleBargeIn,
    startBrowserRecognition,
    submitUserSpeech,
  ]);

  maintainRecognitionLoopRef.current = maintainRecognitionLoop;

  const startListening = useCallback(() => {
    maintainRecognitionLoop();
  }, [maintainRecognitionLoop]);

  const startSession = useCallback(async () => {
    setError(null);
    setSttFallbackWarning(null);
    setStatus('connecting');
    autoStartAllowedRef.current = true;
    activeRef.current = true;
    setIsActive(true);
    historyRef.current = [];
    setMessages([]);
    setInterimTranscript('');
    setActiveSpeakers([]);
    setInterruptCount(0);
    turnIdRef.current = 0;

    try {
      const health = await fetch('/api/health');
      if (!health.ok) {
        throw new Error(
          import.meta.env.PROD
            ? 'Voice API unavailable on this deployment — check Vercel env vars (ELEVENLABS_API_KEY, GROQ_API_KEY) and function logs.'
            : 'Voice API is not running. Run: npm run dev',
        );
      }

      const healthData = (await health.json()) as {
        diarization?: boolean;
        scribeStt?: boolean;
        scribeRealtime?: boolean;
        groq?: boolean;
        gemini?: boolean;
      };
      const canScribe = Boolean(healthData.scribeStt ?? healthData.diarization);
      const canRealtime = Boolean(healthData.scribeRealtime ?? canScribe);
      const canDiarize = Boolean(healthData.diarization);
      const canGroq = Boolean(healthData.groq);
      const canGemini = Boolean(healthData.gemini);
      scribeSttRef.current = canScribe;
      scribeRealtimeRef.current = canRealtime;
      diarizationRef.current = canDiarize;
      setScribeSttEnabled(canScribe);
      setScribeRealtimeEnabled(canRealtime);
      setDiarizationEnabled(canDiarize);
      setGroqEnabled(canGroq);
      setGeminiEnabled(canGemini);

      await fetch('/api/voice/warmup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          voiceApiBody({
            personaId: persona.id,
          }),
        ),
      }).catch(() => undefined);

      const greeting =
        customGreetingRef.current?.trim() ||
        greetingForMode(persona, languageModeRef.current);
      if (languageModeRef.current === 'ur') {
        lastLanguageRef.current = 'ur';
        lastSttLocaleRef.current = resolveSttLocale('ur', 'ur');
        setActiveLanguage('ur');
      } else if (languageModeRef.current === 'en') {
        lastLanguageRef.current = 'en';
        lastSttLocaleRef.current = resolveSttLocale('en', 'en');
        setActiveLanguage('en');
      } else {
        lastLanguageRef.current = 'en';
        lastSttLocaleRef.current = resolveSttLocale('auto', 'en');
        setActiveLanguage('en');
      }

      const agentLine: TranscriptLine = {
        role: 'assistant',
        text: greeting,
        speakerId: 'agent',
        speakerLabel: displayName(),
      };
      historyRef.current = [agentLine];
      setMessages([agentLine]);
      setActiveSpeakers(['agent']);

      // Warm the recognizer up front. Starting it only after the greeting meant
      // anyone who answered during or immediately after it was never heard.
      postGreetingGraceUntilRef.current = Date.now() + POST_GREETING_GRACE_MS;
      maintainRecognitionLoop();
      await speakPipeline(greeting);
      postGreetingGraceUntilRef.current = Date.now() + POST_GREETING_GRACE_MS;
      if (activeRef.current && !speakingRef.current && !thinkingRef.current) {
        setStatus('listening');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
      setStatus('error');
      activeRef.current = false;
      setIsActive(false);
      thinkingRef.current = false;
      speakingRef.current = false;
      processingRef.current = false;
      if (recognitionRestartRef.current != null) {
        window.clearTimeout(recognitionRestartRef.current);
        recognitionRestartRef.current = null;
      }
      if (utteranceDebounceRef.current != null) {
        window.clearTimeout(utteranceDebounceRef.current);
        utteranceDebounceRef.current = null;
      }
      pendingUtteranceRef.current = '';
      stopRecognition();
      stopVadMonitor();
      clearBargeInAwaitingFinal();
      releaseRecorder();
      stopAudio();
      setInterimTranscript('');
    }
  }, [
    clearBargeInAwaitingFinal,
    displayName,
    maintainRecognitionLoop,
    persona,
    releaseRecorder,
    speakPipeline,
    stopAudio,
    stopRecognition,
    stopVadMonitor,
    voiceApiBody,
  ]);

  /**
   * Text → voice turn (demo prompt chips, typed sandbox input).
   * Starts a session (greeting TTS) if idle, then runs the LLM+TTS pipeline.
   */
  const sendTextTurn = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || processingRef.current) return;
      processingRef.current = true;
      setError(null);
      try {
        if (!activeRef.current) {
          await startSession();
        }
        if (!activeRef.current) return;
        await processUserMessage(trimmed, performance.now(), null);
      } finally {
        processingRef.current = false;
      }
    },
    [processUserMessage, startSession],
  );

  /**
   * Without this the row stays "active" forever, so duration and completion rate
   * are unmeasurable. keepalive lets it land even when the tab is closing.
   */
  const closeServerConversation = useCallback(() => {
    const orgId = orgIdRef.current;
    const conversationId = conversationIdRef.current;
    conversationIdRef.current = null;
    if (!orgId || !conversationId) return;
    void fetch(`/api/orgs/${orgId}/conversations/${conversationId}/end`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended' }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const endSession = useCallback((options?: { userInitiated?: boolean }) => {
    if (options?.userInitiated) autoStartAllowedRef.current = false;
    closeServerConversation();
    activeRef.current = false;
    setIsActive(false);
    thinkingRef.current = false;
    speakingRef.current = false;
    processingRef.current = false;
    if (recognitionRestartRef.current != null) {
      window.clearTimeout(recognitionRestartRef.current);
      recognitionRestartRef.current = null;
    }
    if (utteranceDebounceRef.current != null) {
      window.clearTimeout(utteranceDebounceRef.current);
      utteranceDebounceRef.current = null;
    }
    pendingUtteranceRef.current = '';
    stopRecognition();
    stopVadMonitor();
    clearBargeInAwaitingFinal();
    releaseRecorder();
    stopAudio();
    setInterimTranscript('');
    setError(null);
    setStatus('idle');
  }, [
    clearBargeInAwaitingFinal,
    closeServerConversation,
    releaseRecorder,
    stopAudio,
    stopRecognition,
    stopVadMonitor,
  ]);

  const resetConversation = useCallback(() => {
    conversationIdRef.current = null;
    if (isActive) {
      endSession();
    } else {
      historyRef.current = [];
      setMessages([]);
      setError(null);
      setLatencyMs(null);
      setActiveSpeakers([]);
      setInterruptCount(0);
      setStatus('idle');
    }
  }, [endSession, isActive]);

  const autoStart = options?.autoStart ?? false;
  const sessionKey = `${personaId}|${languageMode}|${options?.sessionId ?? ''}`;

  useEffect(() => {
    if (!autoStart) return;
    if (!autoStartAllowedRef.current) return;
    void startSession();
    return () => {
      if (activeRef.current) endSession();
    };
  }, [autoStart, sessionKey, startSession, endSession]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopRecognition();
      stopVadMonitor();
      releaseRecorder();
      stopAudio();
    };
  }, [releaseRecorder, stopAudio, stopRecognition, stopVadMonitor]);

  return {
    persona,
    status,
    messages,
    error,
    latencyMs,
    isActive,
    activeLanguage,
    languageMode,
    diarizationEnabled,
    scribeSttEnabled,
    scribeRealtimeEnabled,
    groqEnabled,
    geminiEnabled,
    activeSpeakers,
    interruptCount,
    interimTranscript,
    sttFallbackWarning,
    startSession,
    endSession,
    resetConversation,
    startListening,
    sendTextTurn,
  };
}
