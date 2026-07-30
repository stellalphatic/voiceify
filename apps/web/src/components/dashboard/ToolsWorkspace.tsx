import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Link2, Plus, Plug, Search, Settings2, Trash2, Wrench } from 'lucide-react';
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
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'SMB',
    description: 'Log leads and bookings into a Google Sheet via Apps Script webhook.',
    badge: '1-click',
    template: {
      name: 'Google Sheets Logger',
      slug: 'google_sheets_log',
      description: 'Append a row to Google Sheets',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"name":"{{name}}","phone":"{{phone}}","notes":"{{notes}}","source":"voiceify"}',
      },
    },
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'SMB',
    description: 'Create calendar events through a Calendar webhook or Apps Script.',
    badge: '1-click',
    template: {
      name: 'Google Calendar Booking',
      slug: 'google_calendar_book',
      description: 'Create a calendar event',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://script.google.com/macros/s/YOUR_CALENDAR_DEPLOYMENT/exec',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"title":"{{title}}","start":"{{datetime}}","guest":"{{customerName}}","phone":"{{phone}}"}',
      },
    },
  },
  {
    id: 'gmail-notify',
    name: 'Email (Gmail / Outlook)',
    category: 'SMB',
    description: 'Send a booking notification email via your Zapier/Make/n8n mail webhook.',
    badge: '1-click',
    template: {
      name: 'Email Notify',
      slug: 'email_notify',
      description: 'Email ops on new booking',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate:
          '{"to":"{{to}}","subject":"New Voiceify booking","body":"{{summary}}","customer":"{{customerName}}"}',
      },
    },
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    category: 'SMB',
    description: 'Send WhatsApp follow-ups via Meta Cloud API or a BSP webhook.',
    badge: '1-click',
    template: {
      name: 'WhatsApp Follow-up',
      slug: 'whatsapp_followup',
      description: 'Send WhatsApp template message',
      type: 'http',
      config: {
        method: 'POST',
        url: 'https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages',
        headers: {
          Authorization: 'Bearer YOUR_WHATSAPP_TOKEN',
          'Content-Type': 'application/json',
        },
        bodyTemplate:
          '{"messaging_product":"whatsapp","to":"{{phone}}","type":"text","text":{"body":"{{summary}}"}}',
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
  'SMB',
  'CRM',
  'Messaging',
  'Developer Tools',
  'Customer Support & CX',
] as const;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || 'custom_http';
}

export default function ToolsWorkspace() {
  const orgId = getActiveOrgId();
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All integrations');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [editing, setEditing] = useState<ToolRow | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editMethod, setEditMethod] = useState('POST');
  const [editHeaders, setEditHeaders] = useState('{}');
  const [editBody, setEditBody] = useState('');
  const [customName, setCustomName] = useState('My API tool');
  const [customUrl, setCustomUrl] = useState('https://');
  const [customMethod, setCustomMethod] = useState('POST');
  const [customHeaders, setCustomHeaders] = useState('{"Content-Type":"application/json"}');
  const [customBody, setCustomBody] = useState('{"query":"{{message}}"}');

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

  const createCustom = async () => {
    if (!orgId) return;
    if (!customUrl.trim() || !/^https?:\/\//i.test(customUrl.trim())) {
      setError('URL must be a full http(s) address, e.g. https://example.com/hook');
      return;
    }
    let headers: Record<string, unknown> = {};
    try {
      headers = JSON.parse(customHeaders || '{}') as Record<string, unknown>;
    } catch {
      setError('Custom headers must be valid JSON');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/orgs/${orgId}/tools`, {
        method: 'POST',
        body: JSON.stringify({
          name: customName.trim() || 'Custom HTTP',
          slug: slugify(customName),
          description: 'User-configured HTTP tool',
          type: 'http',
          config: {
            method: customMethod,
            url: customUrl.trim(),
            headers,
            bodyTemplate: customBody,
          },
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tool');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (tool: ToolRow) => {
    if (tool.type !== 'http') {
      setError('Pack tools are configured by their automation pack. Use Workflows to reinstall or manage them.');
      return;
    }
    setEditing(tool);
    setEditUrl(String(tool.config.url ?? ''));
    setEditMethod(String(tool.config.method ?? 'POST'));
    setEditHeaders(JSON.stringify(tool.config.headers ?? {}, null, 2));
    setEditBody(String(tool.config.bodyTemplate ?? ''));
  };

  const saveEdit = async () => {
    if (!orgId || !editing) return;
    if (!editUrl.trim() || !/^https?:\/\//i.test(editUrl.trim())) {
      setError('URL must be a full http(s) address, e.g. https://example.com/hook');
      return;
    }
    let headers: Record<string, unknown> = {};
    try {
      headers = JSON.parse(editHeaders || '{}') as Record<string, unknown>;
    } catch {
      setError('Headers must be valid JSON');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/orgs/${orgId}/tools/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          config: {
            ...editing.config,
            method: editMethod,
            url: editUrl.trim(),
            headers,
            bodyTemplate: editBody,
          },
        }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tool');
    } finally {
      setBusy(false);
    }
  };

  const removeTool = async (toolId: string) => {
    if (!orgId) return;
    if (!window.confirm('Remove this tool? Agents will no longer be able to call it.')) return;
    setBusy(true);
    try {
      await apiJson(`/api/orgs/${orgId}/tools/${toolId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete tool');
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
            Connect Google Sheets, Calendar, WhatsApp, email, CRMs, and custom APIs. Configure URLs,
            headers, and body templates so agents can call tools during conversations.
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
          <Link2 size={18} />
          Connect custom API
        </h3>
        <p className="vfy-settings-help">
          Point the agent at any HTTPS endpoint. Use {'{{message}}'}, {'{{name}}'}, {'{{phone}}'}{' '}
          placeholders in the body template.
        </p>
        <div className="space-y-3">
          <input
            className="vfy-field-input"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Tool name"
            aria-label="Custom tool name"
          />
          <div className="vfy-settings-row">
            <select
              className="vfy-field-select"
              style={{ maxWidth: 120 }}
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              aria-label="HTTP method"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="vfy-field-input"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://api.example.com/v1/action"
              aria-label="API URL"
            />
          </div>
          <textarea
            className="vfy-field-textarea"
            rows={3}
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            placeholder='{"Authorization":"Bearer …"}'
            aria-label="Headers JSON"
          />
          <textarea
            className="vfy-field-textarea"
            rows={3}
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            placeholder="Body template"
            aria-label="Body template"
          />
          <button
            type="button"
            className="vfy-btn vfy-btn-primary"
            disabled={busy || !orgId || !customUrl.trim()}
            onClick={() => void createCustom()}
          >
            <Plus size={14} />
            Add API tool
          </button>
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Wrench size={18} />
          Installed tools
        </h3>
        <ul className="vfy-settings-list">
          {tools.length === 0 && (
            <li className="vfy-settings-empty">
              No tools yet. Add a custom API above or browse the library.
            </li>
          )}
          {tools.map((t) => (
            <li key={t.id} className="vfy-settings-list-item">
              <div>
                <p className="vfy-settings-item-title">{t.name}</p>
                <p className="vfy-settings-item-meta">
                  {t.slug} · {t.type}
                  {typeof t.config.url === 'string' ? ` · ${t.config.url}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-ghost"
                  disabled={busy}
                  onClick={() => openEdit(t)}
                >
                  <Settings2 size={14} />
                  Configure
                </button>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-ghost"
                  disabled={busy}
                  onClick={() => void testTool(t.id)}
                >
                  Test
                </button>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-ghost"
                  disabled={busy}
                  onClick={() => void removeTool(t.id)}
                  aria-label={`Remove ${t.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {testResult && (
          <pre className="vfy-settings-secret" style={{ marginTop: 12, overflow: 'auto' }}>
            <code>{testResult}</code>
          </pre>
        )}
      </section>

      {editing && (
        <section className="vfy-settings-card" aria-label="Configure tool">
          <h3 className="vfy-settings-card-title">Configure · {editing.name}</h3>
          <div className="space-y-3">
            <div className="vfy-settings-row">
              <select
                className="vfy-field-select"
                style={{ maxWidth: 120 }}
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="vfy-field-input"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                aria-label="Tool URL"
              />
            </div>
            <textarea
              className="vfy-field-textarea"
              rows={4}
              value={editHeaders}
              onChange={(e) => setEditHeaders(e.target.value)}
              aria-label="Headers JSON"
            />
            <textarea
              className="vfy-field-textarea"
              rows={3}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              aria-label="Body template"
            />
            <div className="vfy-settings-row">
              <button type="button" className="vfy-btn vfy-btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="vfy-btn vfy-btn-primary"
                disabled={busy}
                onClick={() => void saveEdit()}
              >
                Save access config
              </button>
            </div>
          </div>
        </section>
      )}

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
