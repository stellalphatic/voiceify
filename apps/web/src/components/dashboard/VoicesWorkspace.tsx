import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic2, Search, Volume2 } from 'lucide-react';
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
  return (payload.voices ?? []).map((v) => ({
    id: v.id ?? v.voice_id ?? '',
    name: v.name,
    labels: v.labels,
  })).filter((v) => v.id);
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
    <div className="max-w-6xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// configure · voices</p>
          <h1 className="vfy-page-title">Voice library</h1>
          <p className="vfy-page-sub">
            Browse production voices with accents and language tags. Assign a voice ID to any agent
            for English, Urdu, or mixed conversations.
          </p>
        </div>
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
            Recommended personas
          </h3>
          <div className="vfy-tools-grid">
            {personas.map((p) => (
              <div key={p.id} className="vfy-tools-card" style={{ cursor: 'default' }}>
                <span className="vfy-tools-card-icon">
                  <Volume2 size={18} />
                </span>
                <span className="vfy-tools-card-title">{p.name}</span>
                <span className="vfy-tools-card-desc">{p.tagline}</span>
                <code className="vfy-settings-item-meta">{p.voiceId}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="vfy-settings-row">
        <Search size={16} style={{ color: 'var(--d-muted)' }} />
        <input
          className="vfy-field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search library voices…"
          aria-label="Search voices"
        />
        <select
          className="vfy-field-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Filter language"
          style={{ maxWidth: 180 }}
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l === 'all' ? 'Language' : l}
            </option>
          ))}
        </select>
        <select
          className="vfy-field-select"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          aria-label="Filter accent"
          style={{ maxWidth: 180 }}
        >
          {accents.map((a) => (
            <option key={a} value={a}>
              {a === 'all' ? 'Accent' : a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="vfy-settings-empty">Loading voices…</p>
      ) : (
        <div className="vfy-tools-grid">
          {filtered.map((v) => (
            <div key={v.id} className="vfy-voice-card">
              <div className="vfy-voice-avatar" aria-hidden>
                {v.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="vfy-settings-item-title">{v.name}</p>
                <p className="vfy-settings-item-meta">
                  {[v.labels?.accent, v.labels?.language ?? v.labels?.locale, v.labels?.gender]
                    .filter(Boolean)
                    .join(' · ') || 'General'}
                </p>
                <code className="vfy-settings-item-meta">{v.id}</code>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="vfy-settings-empty">No voices match these filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
