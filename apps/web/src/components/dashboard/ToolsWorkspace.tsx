import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Link2, Plus, Plug, Search, Wrench } from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

type ToolRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  config: Record<string, unknown>;
};

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  template: {
    name: string;
    slug: string;
    description: string;
    type: 'http';
    config: Record<string, unknown>;
  };
};

const CATALOG: CatalogItem[] = [
  {
    id: 'http-webhook',
    name: 'Custom HTTP',
    category: 'Developer Tools',
    description: 'Call any REST endpoint from the agent turn.',
    template: {
      name: 'Custom HTTP',
      slug: 'custom_http',
      description: 'Generic HTTPS webhook',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://example.com/hooks/voiceify',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: '{"event":"{{event}}","payload":{{payload}}}',
      },
    },
  },
  {
    id: 'supabase',
    name: 'Supabase / Postgres',
    category: 'CRM',
    description: 'Query or insert rows via your Supabase REST API.',
    badge: 'HTTP',
    template: {
      name: 'Supabase REST',
      slug: 'supabase_rest',
      description: 'PostgREST insert or select',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://YOUR_PROJECT.supabase.co/rest/v1/leads',
        headers: {
          apikey: 'YOUR_ANON_OR_SERVICE_KEY',
          Authorization: 'Bearer YOUR_ANON_OR_SERVICE_KEY',
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        bodyTemplate: '{"name":"{{name}}","phone":"{{phone}}","source":"voiceify"}',
      },
    },
  },
  {
    id: 'mongodb',
    name: 'MongoDB Atlas Data API',
    category: 'Developer Tools',
    description: 'Insert or find documents through Atlas Data API.',
    badge: 'HTTP',
    template: {
      name: 'MongoDB Data API',
      slug: 'mongodb_data_api',
      description: 'Atlas Data API insertOne',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://data.mongodb-api.com/app/YOUR_APP/endpoint/data/v1/action/insertOne',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'YOUR_DATA_API_KEY',
        },
        bodyTemplate:
          '{"dataSource":"Cluster0","database":"voiceify","collection":"events","document":{{payload}}}',
      },
    },
  },
  {
    id: 'square',
    name: 'Square POS',
    category: 'CRM',
    description: 'Look up catalog or create orders via Square APIs.',
    badge: 'HTTP',
    template: {
      name: 'Square Orders',
      slug: 'square_orders',
      description: 'Create a Square order draft',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://connect.squareup.com/v2/orders',
        headers: {
          Authorization: 'Bearer YOUR_SQUARE_TOKEN',
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        bodyTemplate: '{"order":{"location_id":"YOUR_LOCATION","line_items":{{items}}}}',
      },
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Messaging',
    description: 'Post call summaries to a Slack channel.',
    template: {
      name: 'Slack Incoming Webhook',
      slug: 'slack_notify',
      description: 'Notify ops on Slack',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: '{"text":"Voiceify: {{summary}}"}',
      },
    },
  },
  {
    id: 'mcp',
    name: 'Custom MCP bridge',
    category: 'Developer Tools',
    description: 'Bridge Model Context Protocol tools over HTTPS to your MCP gateway.',
    badge: 'Alpha',
    template: {
      name: 'MCP Bridge',
      slug: 'mcp_bridge',
      description: 'Forward tool calls to an MCP HTTP gateway',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://mcp.your-domain.com/v1/tools/call',
        headers: {
          Authorization: 'Bearer YOUR_MCP_TOKEN',
          'Content-Type': 'application/json',
        },
        bodyTemplate: '{"name":"{{tool}}","arguments":{{args}}}',
      },
    },
  },
];

const CATEGORIES = [
  'All integrations',
  'CRM',
  'Messaging',
  'Developer Tools',
  'Customer Support & CX',
] as const;

export default function ToolsWorkspace() {
  const orgId = getActiveOrgId();
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All integrations');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await apiJson<{ tools: ToolRow[] }>(`/api/orgs/${orgId}/tools`);
      setTools(data.tools);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return CATALOG.filter((item) => {
      const catOk = category === 'All integrations' || item.category === category;
      const q = search.trim().toLowerCase();
      const searchOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [category, search]);

  const install = async (item: CatalogItem) => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/orgs/${orgId}/tools`, {
        method: 'POST',
        body: JSON.stringify(item.template),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tool');
    } finally {
      setBusy(false);
    }
  };

  const testTool = async (toolId: string) => {
    if (!orgId) return;
    setBusy(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await apiJson<{ ok: boolean; result?: unknown; error?: string }>(
        `/api/orgs/${orgId}/tools/${toolId}/test`,
        { method: 'POST', body: JSON.stringify({ args: {} }) },
      );
      setTestResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tool test failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// configure · tools</p>
          <h1 className="vfy-page-title">Tools & integrations</h1>
          <p className="vfy-page-sub">
            Connect CRMs, databases, POS systems, Slack, and MCP gateways. Agents call these tools
            during conversations with validated HTTP requests.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Wrench size={18} />
          Installed tools
        </h3>
        <ul className="vfy-settings-list">
          {tools.length === 0 && (
            <li className="vfy-settings-empty">
              No tools yet. Browse the library below to add HTTP, database, POS, or MCP bridges.
            </li>
          )}
          {tools.map((t) => (
            <li key={t.id} className="vfy-settings-list-item">
              <div>
                <p className="vfy-settings-item-title">{t.name}</p>
                <p className="vfy-settings-item-meta">
                  {t.slug} · {t.type}
                  {t.description ? ` · ${t.description}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="vfy-btn vfy-btn-ghost"
                disabled={busy}
                onClick={() => void testTool(t.id)}
              >
                Test
              </button>
            </li>
          ))}
        </ul>
        {testResult && (
          <pre className="vfy-settings-secret" style={{ marginTop: 12, overflow: 'auto' }}>
            <code>{testResult}</code>
          </pre>
        )}
      </section>

      <div className="vfy-tools-layout">
        <aside className="vfy-tools-cats" aria-label="Integration categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`vfy-tools-cat${category === c ? ' is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </aside>

        <div className="vfy-tools-main">
          <div className="vfy-settings-row">
            <h2 className="vfy-panel-title" style={{ margin: 0, flex: 1 }}>
              {category}
            </h2>
            <div className="vfy-settings-row" style={{ margin: 0, flex: 1 }}>
              <Search size={16} style={{ color: 'var(--d-muted)' }} />
              <input
                className="vfy-field-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations…"
                aria-label="Search integrations"
              />
            </div>
          </div>

          <div className="vfy-tools-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="vfy-tools-card"
                disabled={busy || !orgId}
                onClick={() => void install(item)}
              >
                <span className="vfy-tools-card-icon">
                  {item.id === 'mongodb' || item.id === 'supabase' ? (
                    <Database size={18} />
                  ) : item.id === 'mcp' ? (
                    <Plug size={18} />
                  ) : (
                    <Link2 size={18} />
                  )}
                </span>
                <span className="vfy-tools-card-title">
                  {item.name}
                  {item.badge && <span className="vfy-tag">{item.badge}</span>}
                </span>
                <span className="vfy-tools-card-desc">{item.description}</span>
                <span className="vfy-tools-card-cta">
                  <Plus size={14} /> Add
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
