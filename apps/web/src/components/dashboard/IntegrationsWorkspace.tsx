import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  CircleAlert,
  Database,
  KeyRound,
  Mic,
  Server,
  Sparkles,
  Waves,
} from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { SMB_CONNECTORS } from '../../lib/connectors/catalog';
import ConnectorGrid from '../connectors/ConnectorGrid';

type Health = {
  gemini?: boolean;
  groq?: boolean;
  elevenlabs?: boolean;
  emailConfigured?: boolean;
  coqui?: boolean;
  qdrant?: boolean;
  models?: {
    llm?: string;
    llmFallback?: string;
    stt?: string;
    tts?: string;
  };
};

type ToolRow = { slug: string };

export default function IntegrationsWorkspace() {
  const orgId = getActiveOrgId();
  const [health, setHealth] = useState<Health | null>(null);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTools = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await apiJson<{ tools: ToolRow[] }>(`/api/orgs/${orgId}/tools`);
      setTools(data.tools);
    } catch {
      /* optional */
    }
  }, [orgId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/health', { credentials: 'include' });
        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
        const data = (await res.json()) as Health;
        if (!cancelled) setHealth(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load provider status');
        }
      }
    })();
    void loadTools();
    return () => {
      cancelled = true;
    };
  }, [loadTools]);

  const installedSlugs = useMemo(() => new Set(tools.map((t) => t.slug)), [tools]);

  const providers = [
    {
      name: 'Speech engine',
      role: health?.models?.stt
        ? `STT ${health.models.stt} · TTS ${health.models.tts ?? 'flash'}`
        : 'Realtime speech-to-text and natural text-to-speech',
      ok: health?.elevenlabs,
      icon: Mic,
      statusLabel: (ready: boolean) => (ready ? 'Configured' : 'Not configured'),
    },
    {
      name: 'Primary LLM',
      role: health?.models?.llm
        ? `Groq · ${health.models.llm}`
        : 'Low-latency reasoning for live agent replies',
      ok: health?.groq,
      icon: Sparkles,
      statusLabel: (ready: boolean) => (ready ? 'Configured' : 'Not configured'),
    },
    {
      name: 'Fallback LLM',
      role: health?.models?.llmFallback
        ? `Optional · ${health.models.llmFallback}`
        : 'Optional Gemini backup for resilience',
      ok: health?.gemini,
      icon: Waves,
      statusLabel: (ready: boolean) => {
        if (ready) return 'Configured';
        if (health?.groq) return 'Optional (primary healthy)';
        return 'Not configured';
      },
    },
  ];

  const openSource = [
    {
      name: 'Coqui XTTS',
      role: 'Self-hosted TTS alternative (TTS_PROVIDER=coqui)',
      ok: health?.coqui,
      icon: Server,
    },
    {
      name: 'Qdrant',
      role: 'Optional vector store for knowledge retrieval',
      ok: health?.qdrant,
      icon: Database,
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Manage · Integrations</p>
          <h1 className="vfy-page-title">Integrations</h1>
          <p className="vfy-page-sub">
            Step-by-step setup for Google Sheets, WhatsApp, Calendar, and Email. Platform voice
            providers stay on the server, never in the browser.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}

      <section className="vfy-settings-card vfy-connector-hero">
        <h3 className="vfy-settings-card-title">Business connectors</h3>
        <p className="vfy-settings-help">
          Log bookings to Sheets, ping WhatsApp, create Calendar events, and email yourself when a
          lead comes in. Each one walks you through creating the endpoint on your side first.
        </p>
        <ConnectorGrid
          connectors={SMB_CONNECTORS}
          installedSlugs={installedSlugs}
          onInstalled={() => void loadTools()}
        />
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">Voice pipeline (platform)</h3>
        <p className="vfy-settings-help">
          Status reflects keys on the API host. Operators manage these in server environment
          variables.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {providers.map((p) => {
            const Icon = p.icon;
            const ready = p.ok === true;
            return (
              <article
                key={p.name}
                className="vfy-settings-list-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} />
                  <p className="vfy-settings-item-title">{p.name}</p>
                </div>
                <p className="vfy-settings-item-meta">{p.role}</p>
                <p
                  className="vfy-settings-item-meta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}
                >
                  {ready ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                  {health == null ? 'Checking…' : p.statusLabel(ready)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">Open-source backends</h3>
        <p className="vfy-settings-help">
          Optional self-hosted path (Llama 3.3 via Groq by default, Coqui XTTS, Qdrant).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {openSource.map((p) => {
            const Icon = p.icon;
            const ready = p.ok === true;
            return (
              <article
                key={p.name}
                className="vfy-settings-list-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} />
                  <p className="vfy-settings-item-title">{p.name}</p>
                </div>
                <p className="vfy-settings-item-meta">{p.role}</p>
                <p
                  className="vfy-settings-item-meta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}
                >
                  {ready ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                  {health == null ? 'Checking…' : ready ? 'Configured' : 'Not enabled'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <KeyRound size={18} />
          Connect your product
        </h3>
        <p className="vfy-settings-help">
          Create a <code>vfk_</code> API key for server-to-server calls, or a <code>vw_</code> embed
          token for the browser widget.
        </p>
        <div className="vfy-settings-row">
          <Link
            to="/dashboard/api-keys"
            className="vfy-btn vfy-btn-primary"
            style={{ display: 'inline-flex' }}
          >
            API keys &amp; embed
          </Link>
          <Link
            to="/dashboard/tools"
            className="vfy-btn vfy-btn-ghost"
            style={{ display: 'inline-flex' }}
          >
            All tools
          </Link>
          <Link to="/docs" className="vfy-btn vfy-btn-ghost" style={{ display: 'inline-flex' }}>
            API docs
          </Link>
        </div>
      </section>
    </div>
  );
}
