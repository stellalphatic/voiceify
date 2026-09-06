import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Bot, Mic2, Search, Volume2 } from 'lucide-react';
import { apiJson } from '../../lib/auth/client';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';

type VoiceRow = {
  id: string;
  name: string;
  labels?: Record<string, string>;
};

type VoicesPayload = {
  voices: Array<{ id?: string; voice_id?: string; name: string; labels?: Record<string, string> }>;
  personas?: Array<{ id: string; name: string; tagline: string; voiceId: string }>;
};

function normalizeVoices(payload: VoicesPayload): VoiceRow[] {
  return (payload.voices ?? [])
    .map((v) => ({
      id: v.id ?? v.voice_id ?? '',
      name: v.name,
      labels: v.labels,
    }))
    .filter((v) => v.id);
}

function voiceMeta(v: VoiceRow) {
  return [v.labels?.accent, v.labels?.language ?? v.labels?.locale, v.labels?.gender]
    .filter(Boolean)
    .join(' · ');
}

const PREVIEW_SAMPLE_RATE = 22050;

async function requestPreview(text: string, voiceId: string): Promise<ArrayBuffer> {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  });

  if (res.ok) return res.arrayBuffer();

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 404) {
    throw new Error('Preview endpoint missing — redeploy the API service.');
  }
  throw new Error(body.error ?? `Preview failed (${res.status})`);
}

function PreviewVoiceButton({ voiceId, name }: { voiceId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      sourceRef.current?.stop();
      void audioCtxRef.current?.close();
    };
  }, []);

  const play = async () => {
    setBusy(true);
    setErr(null);
    try {
      sourceRef.current?.stop();
      sourceRef.current = null;

      const pcm = await requestPreview(
        `Hi, I'm ${name}. This is how I sound on Voiceify.`,
        voiceId,
      );
      if (pcm.byteLength === 0) {
        throw new Error('Provider returned no audio for this voice.');
      }

      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio is not supported in this browser.');
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new Ctx({ sampleRate: PREVIEW_SAMPLE_RATE });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const int16 = new Int16Array(pcm);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = (int16[i] ?? 0) / 32768;
      const buffer = ctx.createBuffer(1, float32.length, PREVIEW_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlaying(false);
        sourceRef.current = null;
      };
      sourceRef.current = source;
      setPlaying(true);
      source.start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Preview failed');
      setPlaying(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        className="vfy-btn vfy-btn-ghost"
        disabled={busy}
        onClick={() => void play()}
        aria-label={`Preview ${name}`}
      >
        <Volume2 size={13} />
        {busy ? 'Loading…' : playing ? 'Playing' : 'Preview'}
      </button>
      {err ? (
        <span
          role="alert"
          className="vfy-settings-item-meta"
          style={{ color: 'var(--d-danger)', maxWidth: 200, textAlign: 'right' }}
        >
          {err}
        </span>
      ) : null}
    </div>
  );
}

export default function VoicesWorkspace() {
  const { agents, updateAgent } = useAgentStore();
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [personas, setPersonas] = useState<VoicesPayload['personas']>([]);
  const [search, setSearch] = useState('');
  const [accent, setAccent] = useState('all');
  const [language, setLanguage] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const assignVoice = async (voiceId: string, voiceName: string) => {
    const agent = agents.find((item) => String(item.id) === selectedAgentId);
    if (!agent) {
      setError('Select an agent before assigning a voice.');
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await updateAgent({ ...agent, voice: voiceId });
      setMessage(`${voiceName} assigned to ${agent.name} and saved on the server.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign this voice');
    } finally {
      setLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<VoicesPayload>('/api/voice/voices');
      setVoices(normalizeVoices(data));
      setPersonas(data.personas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load voice library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accents = useMemo(() => {
    const set = new Set<string>();
    voices.forEach((v) => {
      const a = v.labels?.accent;
      if (a) set.add(a);
    });
    return ['all', ...Array.from(set).sort()];
  }, [voices]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    voices.forEach((v) => {
      const l = v.labels?.language ?? v.labels?.locale;
      if (l) set.add(l);
    });
    return ['all', ...Array.from(set).sort()];
  }, [voices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voices.filter((v) => {
      if (accent !== 'all' && (v.labels?.accent ?? '') !== accent) return false;
      if (language !== 'all') {
        const l = v.labels?.language ?? v.labels?.locale ?? '';
        if (l !== language) return false;
      }
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        Object.values(v.labels ?? {}).some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [voices, search, accent, language]);

  return (
    <div className="vfy-voices-page">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Configure · Voices</p>
          <h1 className="vfy-page-title">Voice library</h1>
          <p className="vfy-page-sub">
            Select an agent, preview voices, then assign one directly.
          </p>
        </div>
        {!loading && (
          <p className="vfy-voices-count" aria-live="polite">
            {filtered.length} of {voices.length}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm" role="status" style={{ color: 'var(--d-accent)' }}>
          {message}
        </p>
      )}

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Bot size={18} />
          Apply voice to agent
        </h3>
        <select
          className="vfy-field-select"
          value={selectedAgentId}
          onChange={(event) => setSelectedAgentId(event.target.value)}
          aria-label="Select agent for voice assignment"
        >
          <option value="">Select an agent</option>
          {agents.map((agent) => (
            <option key={agent.id} value={String(agent.id)}>
              {agent.name}
            </option>
          ))}
        </select>
      </section>

      {personas && personas.length > 0 && (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <Mic2 size={18} />
            Recommended
          </h3>
          <div className="vfy-voices-personas">
            {personas.map((p) => (
              <div key={p.id} className="vfy-voices-persona">
                <span className="vfy-voices-persona-icon" aria-hidden>
                  <Volume2 size={16} />
                </span>
                <div className="vfy-voices-persona-body">
                  <p className="vfy-voices-persona-name">{p.name}</p>
                  <p className="vfy-voices-persona-tag">{p.tagline}</p>
                </div>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-primary"
                  disabled={!selectedAgentId}
                  onClick={() => void assignVoice(p.voiceId, p.name)}
                >
                  Assign
                </button>
                <PreviewVoiceButton voiceId={p.voiceId} name={p.name} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="vfy-voices-toolbar">
        <div className="vfy-voices-search">
          <Search size={15} aria-hidden />
          <input
            className="vfy-field-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voices…"
            aria-label="Search voices"
          />
        </div>
        <select
          className="vfy-field-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Filter language"
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l === 'all' ? 'All languages' : l}
            </option>
          ))}
        </select>
        <select
          className="vfy-field-select"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          aria-label="Filter accent"
        >
          {accents.map((a) => (
            <option key={a} value={a}>
              {a === 'all' ? 'All accents' : a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="vfy-settings-empty">Loading voices…</p>
      ) : (
        <ul className="vfy-voices-list">
          {filtered.map((v) => {
            const meta = voiceMeta(v);
            return (
              <li key={v.id} className="vfy-voice-row">
                <span className="vfy-voice-avatar" aria-hidden>
                  {v.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="vfy-voice-row-main">
                  <p className="vfy-voice-row-name">{v.name}</p>
                  {meta ? <p className="vfy-voice-row-meta">{meta}</p> : null}
                </div>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-primary"
                  disabled={!selectedAgentId}
                  onClick={() => void assignVoice(v.id, v.name)}
                >
                  Assign
                </button>
                <PreviewVoiceButton voiceId={v.id} name={v.name} />
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="vfy-settings-empty">No voices match these filters.</li>
          )}
        </ul>
      )}
    </div>
  );
}
