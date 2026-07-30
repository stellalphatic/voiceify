import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Mic2, Search, Volume2 } from 'lucide-react';
import { apiJson } from '../../lib/auth/client';

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

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="vfy-btn vfy-btn-ghost vfy-voice-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      title="Copy voice ID"
      aria-label="Copy voice ID"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy ID'}
    </button>
  );
}

function PreviewVoiceButton({ voiceId, name }: { voiceId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const play = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hi, I'm ${name}. This is how I sound on Voiceify.`,
          voiceId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Preview failed (${res.status})`);
      }
      const pcm = await res.arrayBuffer();
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio not supported');
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new Ctx({ sampleRate: 22050 });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const int16 = new Int16Array(pcm);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = (int16[i] ?? 0) / 32768;
      const buffer = ctx.createBuffer(1, float32.length, 22050);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Preview failed');
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
        {busy ? 'Playing…' : 'Preview'}
      </button>
      {err ? (
        <span className="vfy-settings-item-meta" style={{ color: 'var(--d-danger)', maxWidth: 160 }}>
          {err}
        </span>
      ) : null}
    </div>
  );
}

export default function VoicesWorkspace() {
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [personas, setPersonas] = useState<VoicesPayload['personas']>([]);
  const [search, setSearch] = useState('');
  const [accent, setAccent] = useState('all');
  const [language, setLanguage] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          <p className="vfy-page-eyebrow">// configure · voices</p>
          <h1 className="vfy-page-title">Voice library</h1>
          <p className="vfy-page-sub">
            Pick a voice for your agent. Copy the ID and paste it in the agent editor.
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
                <CopyIdButton id={p.voiceId} />
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
                <CopyIdButton id={v.id} />
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
