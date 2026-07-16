/**
 * Workspace settings — credits (read-only for tenants), API keys, embed widgets.
 * Provider keys (Groq/ElevenLabs/Gemini) stay on the server and are never shown here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, KeyRound, Link2, Trash2, Zap } from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';
import { getSettingsPageMeta, type SettingsFocus } from '../../lib/dashboard/settings';

export type { SettingsFocus };

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type EmbedConfig = {
  id: string;
  publicKey: string;
  agentId: string;
  allowedOrigins: string[];
  createdAt: string;
};

export default function SettingsWorkspace({ focus = 'settings' }: { focus?: SettingsFocus }) {
  const orgId = getActiveOrgId();
  const { agents } = useAgentStore();
  const serverAgents = agents.filter((a) => a.serverId);

  const [creditBalanceCents, setCreditBalanceCents] = useState<number | null>(null);
  const [billingMessage, setBillingMessage] = useState('');
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [embeds, setEmbeds] = useState<EmbedConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newKeyName, setNewKeyName] = useState('Production');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [embedAgentId, setEmbedAgentId] = useState('');
  const [embedSnippet, setEmbedSnippet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { showBilling, showDevelopers, title: pageTitle, eyebrow: pageEyebrow, subtitle: pageSub } =
    getSettingsPageMeta(focus);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const [billing, keyData, embedData] = await Promise.all([
        apiJson<{
          creditBalanceCents: number;
          billing?: { message?: string };
        }>(`/api/orgs/${orgId}/billing`),
        apiJson<{ keys: ApiKeyRow[] }>(`/api/orgs/${orgId}/api-keys`),
        apiJson<{ configs: EmbedConfig[] }>(`/api/orgs/${orgId}/embed`).catch(() => ({
          configs: [] as EmbedConfig[],
        })),
      ]);
      setCreditBalanceCents(billing.creditBalanceCents);
      setBillingMessage(
        billing.billing?.message ??
          'Credits are granted by a platform admin. Contact support if you need more.',
      );
      setKeys(keyData.keys.filter((k) => !k.revokedAt));
      setEmbeds(embedData.configs);
      if (!embedAgentId && serverAgents[0]?.serverId) {
        setEmbedAgentId(serverAgents[0].serverId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    }
  }, [orgId, embedAgentId, serverAgents]);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    if (!orgId || !newKeyName.trim()) return;
    setBusy(true);
    setError(null);
    setRevealedSecret(null);
    try {
      const result = await apiJson<{
        secret: string;
        key: ApiKeyRow;
      }>(`/api/orgs/${orgId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: ['voice:respond', 'agents:read'],
        }),
      });
      setRevealedSecret(result.secret);
      setNewKeyName('Production');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create API key');
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!orgId) return;
    if (!window.confirm('Revoke this API key? Apps using it will stop working.')) return;
    setBusy(true);
    try {
      await apiJson(`/api/orgs/${orgId}/api-keys/${keyId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke key');
    } finally {
      setBusy(false);
    }
  };

  const createEmbed = async () => {
    if (!orgId || !embedAgentId) {
      setError('Create an agent first, then generate an embed key.');
      return;
    }
    setBusy(true);
    setError(null);
    setEmbedSnippet(null);
    try {
      const result = await apiJson<{ snippet: string; config: EmbedConfig }>(
        `/api/orgs/${orgId}/embed`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: embedAgentId,
            allowedOrigins: ['*'],
          }),
        },
      );
      setEmbedSnippet(result.snippet);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create embed');
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Clipboard unavailable');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">{pageEyebrow}</p>
          <h1 className="vfy-page-title">{pageTitle}</h1>
          <p className="vfy-page-sub">{pageSub}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}

      {!orgId && (
        <p className="text-sm" style={{ color: 'var(--d-muted)' }}>
          No workspace selected. Sign out and sign in again to create one.
        </p>
      )}

      {showBilling && (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <Zap size={18} />
            Credits
          </h3>
          <p className="vfy-settings-balance">
            {creditBalanceCents == null
              ? '…'
              : `$${(creditBalanceCents / 100).toFixed(2)}`}
          </p>
          <p className="vfy-settings-help">{billingMessage}</p>
          <p className="vfy-settings-help">
            Self-serve card top-ups are not enabled. A platform admin assigns credits from the
            super-admin portal.
          </p>
          <p className="vfy-settings-help">
            Need keys for your backend or website? Open{' '}
            <Link to="/dashboard/api-keys" style={{ color: 'var(--d-accent)' }}>
              API keys
            </Link>
            .
          </p>
        </section>
      )}

      {showDevelopers && (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <KeyRound size={18} />
            API keys
          </h3>
          <p className="vfy-settings-help">
            Use a <code>vfk_…</code> secret in the <code>Authorization: Bearer</code> or{' '}
            <code>x-voiceify-key</code> header to call Voiceify from your backend. The full secret
            is shown once at creation.
          </p>

          <div className="vfy-settings-row">
            <input
              className="vfy-field-input"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name"
              aria-label="API key name"
            />
            <button
              type="button"
              className="vfy-btn vfy-btn-primary"
              disabled={busy || !orgId}
              onClick={() => void createKey()}
            >
              Create key
            </button>
          </div>

          {revealedSecret && (
            <div className="vfy-settings-secret" role="status">
              <p>Copy this secret now. You will not see it again.</p>
              <code>{revealedSecret}</code>
              <button
                type="button"
                className="vfy-btn vfy-btn-ghost"
                onClick={() => void copyText(revealedSecret)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                Copy
              </button>
            </div>
          )}

          <ul className="vfy-settings-list">
            {keys.length === 0 && (
              <li className="vfy-settings-empty">No active API keys yet.</li>
            )}
            {keys.map((k) => (
              <li key={k.id} className="vfy-settings-list-item">
                <div>
                  <p className="vfy-settings-item-title">{k.name}</p>
                  <p className="vfy-settings-item-meta">
                    {k.keyPrefix}… · created {new Date(k.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="vfy-btn vfy-btn-ghost"
                  disabled={busy}
                  onClick={() => void revokeKey(k.id)}
                  aria-label={`Revoke ${k.name}`}
                >
                  <Trash2 size={14} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showDevelopers && (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <Link2 size={18} />
            Embed widget
          </h3>
          <p className="vfy-settings-help">
            Generate a public <code>vw_…</code> token and drop the snippet on any site to run an
            agent. Voice provider credentials stay on Voiceify servers.
          </p>

          <div className="vfy-settings-row">
            <select
              className="vfy-field-select"
              value={embedAgentId}
              onChange={(e) => setEmbedAgentId(e.target.value)}
              aria-label="Agent for embed"
            >
              <option value="">Select agent</option>
              {serverAgents.map((a) => (
                <option key={a.serverId} value={a.serverId}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="vfy-btn vfy-btn-primary"
              disabled={busy || !orgId || !embedAgentId}
              onClick={() => void createEmbed()}
            >
              Create embed
            </button>
          </div>

          {embedSnippet && (
            <div className="vfy-settings-secret" role="status">
              <p>Embed snippet</p>
              <code>{embedSnippet}</code>
              <button
                type="button"
                className="vfy-btn vfy-btn-ghost"
                onClick={() => void copyText(embedSnippet)}
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          )}

          <ul className="vfy-settings-list">
            {embeds.length === 0 && (
              <li className="vfy-settings-empty">No embed configs yet.</li>
            )}
            {embeds.map((c) => (
              <li key={c.id} className="vfy-settings-list-item">
                <div>
                  <p className="vfy-settings-item-title">{c.publicKey}</p>
                  <p className="vfy-settings-item-meta">
                    Agent {c.agentId.slice(0, 8)}… · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
