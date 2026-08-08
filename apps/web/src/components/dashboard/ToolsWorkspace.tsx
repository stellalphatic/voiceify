import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Settings2, Trash2, Wrench } from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import {
  ALL_CONNECTORS,
  CONNECTOR_CATEGORIES,
  type ConnectorDef,
} from '../../lib/connectors/catalog';
import ConnectorGrid from '../connectors/ConnectorGrid';
import { BrandIcon } from '../connectors/BrandIcons';

type ToolRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  config: Record<string, unknown>;
};

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'custom_http'
  );
}

function toolTypeLabel(type: string): string {
  if (type === 'http') return 'HTTP';
  if (type === 'pack' || type === 'automation') return 'Pack tool';
  return type.replace(/[_-]+/g, ' ');
}

export default function ToolsWorkspace() {
  const orgId = getActiveOrgId();
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [category, setCategory] =
    useState<(typeof CONNECTOR_CATEGORIES)[number]>('All integrations');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [editing, setEditing] = useState<ToolRow | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editMethod, setEditMethod] = useState('POST');
  const [editHeaders, setEditHeaders] = useState('{}');
  const [editBody, setEditBody] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customMethod, setCustomMethod] = useState('POST');
  const [customHeaders, setCustomHeaders] = useState('{"Content-Type":"application/json"}');
  const [customBody, setCustomBody] = useState('{"event":"{{event}}"}');
  const [showCustom, setShowCustom] = useState(false);

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

  const installedSlugs = useMemo(
    () => new Set(tools.map((t) => t.slug)),
    [tools],
  );

  const filtered: ConnectorDef[] = useMemo(() => {
    return ALL_CONNECTORS.filter((item) => {
      const catOk =
        category === 'All integrations' || item.category === category;
      const q = search.trim().toLowerCase();
      const searchOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [category, search]);

  const smbFirst = useMemo(() => {
    if (category !== 'All integrations' && category !== 'SMB') return [];
    return SMB_ONLY(filtered);
  }, [filtered, category]);

  const restConnectors = useMemo(() => {
    if (category === 'SMB') return [];
    return filtered.filter((c) => c.category !== 'SMB');
  }, [filtered, category]);

  const openEdit = (tool: ToolRow) => {
    if (tool.type !== 'http') {
      setError(
        'Pack tools are managed by automation packs. Reinstall from Workflows if needed.',
      );
      return;
    }
    setEditing(tool);
    setEditUrl(String(tool.config.url ?? ''));
    setEditMethod(String(tool.config.method ?? 'POST'));
    setEditHeaders(JSON.stringify(tool.config.headers ?? {}, null, 2));
    setEditBody(String(tool.config.bodyTemplate ?? ''));
    setError(null);
  };

  const saveEdit = async () => {
    if (!orgId || !editing) return;
    if (!editUrl.trim() || !/^https?:\/\//i.test(editUrl.trim())) {
      setError('URL must be a full http(s) address.');
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
    if (!window.confirm('Remove this tool? Agents will no longer call it.')) return;
    setBusy(true);
    try {
      await apiJson(`/api/orgs/${orgId}/tools/${toolId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const testTool = async (toolId: string) => {
    if (!orgId) return;
    setBusy(true);
    setTestResult(null);
    try {
      const data = await apiJson<{ result: { ok: boolean; error?: string; status?: number } }>(
        `/api/orgs/${orgId}/tools/${toolId}/test`,
        { method: 'POST', body: JSON.stringify({ args: {} }) },
      );
      setTestResult(
        data.result.ok
          ? `Test OK${data.result.status ? ` (${data.result.status})` : ''}`
          : data.result.error ?? 'Test failed',
      );
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  };

  const createCustom = async () => {
    if (!orgId) return;
    if (!customUrl.trim() || !/^https?:\/\//i.test(customUrl.trim())) {
      setError('URL must be a full http(s) address.');
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
      setShowCustom(false);
      setCustomName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tool');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Configure · Tools</p>
          <h1 className="vfy-page-title">Tools & integrations</h1>
          <p className="vfy-page-sub">
            Guided templates for Google Sheets, Calendar, WhatsApp, and Email, plus custom HTTP
            tools. Add your endpoint and credentials once, then your agents call them live in Sandbox.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}
      {testResult && (
        <p className="text-sm" role="status" style={{ color: 'var(--d-accent)' }}>
          {testResult}
        </p>
      )}

      {(category === 'All integrations' || category === 'SMB') && smbFirst.length > 0 && (
        <section className="vfy-settings-card vfy-connector-hero">
          <h3 className="vfy-settings-card-title">Built for small businesses</h3>
          <p className="vfy-settings-help">
            Pre-wired connectors for tools South Asian SMBs already use. No custom API coding.
          </p>
          <ConnectorGrid
            connectors={smbFirst}
            installedSlugs={installedSlugs}
            onInstalled={() => void load()}
          />
        </section>
      )}

      <div className="vfy-tools-layout">
        <aside className="vfy-tools-cats" aria-label="Integration categories">
          {CONNECTOR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`vfy-tools-cat${category === cat ? ' is-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </aside>

        <div className="vfy-tools-main space-y-5">
          <div className="vfy-voices-toolbar">
            <div className="vfy-voices-search">
              <Search size={15} aria-hidden />
              <input
                className="vfy-field-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search connectors…"
                aria-label="Search connectors"
              />
            </div>
            <button
              type="button"
              className="vfy-btn vfy-btn-ghost"
              onClick={() => setShowCustom((v) => !v)}
            >
              <Plus size={14} />
              Custom HTTP
            </button>
          </div>

          {category !== 'SMB' && (
            <ConnectorGrid
              connectors={restConnectors}
              installedSlugs={installedSlugs}
              onInstalled={() => void load()}
              emptyLabel="No connectors match these filters."
            />
          )}

          {showCustom && (
            <section className="vfy-settings-card">
              <h3 className="vfy-settings-card-title">
                <Wrench size={16} /> Custom HTTP tool
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="vfy-field-input"
                  placeholder="Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <select
                  className="vfy-field-select"
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value)}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  className="vfy-field-input"
                  style={{ gridColumn: '1 / -1' }}
                  placeholder="https://…"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <textarea
                  className="vfy-field-textarea"
                  rows={3}
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  placeholder="Headers JSON"
                />
                <textarea
                  className="vfy-field-textarea"
                  rows={3}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Body template"
                />
              </div>
              <button
                type="button"
                className="vfy-btn vfy-btn-primary"
                style={{ marginTop: 12 }}
                disabled={busy || !orgId}
                onClick={() => void createCustom()}
              >
                Save custom tool
              </button>
            </section>
          )}

          <section className="vfy-settings-card">
            <h3 className="vfy-settings-card-title">
              <Settings2 size={16} /> Installed tools
            </h3>
            <p className="vfy-settings-help" style={{ marginBottom: 10 }}>
              HTTP tools can be configured and tested here. Pack tools are managed by automation packs;
              you can still remove them from this workspace.
            </p>
            <ul className="vfy-settings-list">
              {tools.length === 0 && (
                <li className="vfy-settings-empty">
                  No tools yet. Connect Google Sheets, WhatsApp, or another connector above.
                </li>
              )}
              {tools.map((tool) => {
                const brand =
                  ALL_CONNECTORS.find((c) => c.template.slug === tool.slug)?.brand ?? 'http';
                const isHttp = tool.type === 'http';
                return (
                  <li key={tool.id} className="vfy-settings-list-item vfy-tools-installed-row">
                    <div className="vfy-tools-installed-meta">
                      <span className="vfy-connector-icon vfy-connector-icon--sm">
                        <BrandIcon brand={brand} size={18} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p className="vfy-settings-item-title">{tool.name}</p>
                        <p className="vfy-settings-item-meta">
                          {tool.slug} · {toolTypeLabel(tool.type)}
                        </p>
                      </div>
                    </div>
                    <div className="vfy-tools-row-actions">
                      {isHttp ? (
                        <>
                          <button
                            type="button"
                            className="vfy-btn vfy-btn-ghost"
                            disabled={busy}
                            onClick={() => openEdit(tool)}
                          >
                            Configure
                          </button>
                          <button
                            type="button"
                            className="vfy-btn vfy-btn-ghost"
                            disabled={busy}
                            onClick={() => void testTool(tool.id)}
                          >
                            Test
                          </button>
                        </>
                      ) : (
                        <span className="vfy-tools-managed" title="Managed by an automation pack">
                          Pack-managed
                        </span>
                      )}
                      <button
                        type="button"
                        className="vfy-btn vfy-btn-ghost vfy-tools-remove"
                        disabled={busy}
                        onClick={() => void removeTool(tool.id)}
                        aria-label={`Remove ${tool.name}`}
                      >
                        <Trash2 size={14} aria-hidden />
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {editing && (
            <section className="vfy-settings-card">
              <h3 className="vfy-settings-card-title">Edit · {editing.name}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="vfy-field-select"
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
                  placeholder="https://…"
                />
                <textarea
                  className="vfy-field-textarea"
                  rows={4}
                  value={editHeaders}
                  onChange={(e) => setEditHeaders(e.target.value)}
                />
                <textarea
                  className="vfy-field-textarea"
                  rows={4}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              </div>
              <div className="vfy-settings-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-primary"
                  disabled={busy}
                  onClick={() => void saveEdit()}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SMB_ONLY(list: ConnectorDef[]) {
  return list.filter((c) => c.category === 'SMB');
}
