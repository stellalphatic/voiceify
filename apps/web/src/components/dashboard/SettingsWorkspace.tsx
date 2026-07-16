/**
 * Workspace settings — account, password, credits ledger, API keys, embed widgets.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, KeyRound, Link2, Lock, Trash2, User, Zap } from 'lucide-react';
import {
  apiJson,
  changePassword,
  getActiveOrgId,
  getSession,
} from '../../lib/auth/client';
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

type LedgerRow = {
  id: string;
  deltaCents: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

export default function SettingsWorkspace({ focus = 'settings' }: { focus?: SettingsFocus }) {
  const orgId = getActiveOrgId();
  const { agents } = useAgentStore();
  const serverAgents = agents.filter((a) => a.serverId);

  const [creditBalanceCents, setCreditBalanceCents] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
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
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const { showBilling, showDevelopers, title: pageTitle, eyebrow: pageEyebrow, subtitle: pageSub } =
    getSettingsPageMeta(focus);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const session = await getSession();
      if (session?.user) {
        setAccountEmail(session.user.email);
        setAccountName(session.user.name ?? '');
      }

      const [billing, keyData, embedData] = await Promise.all([
        apiJson<{
          creditBalanceCents: number;
          ledger?: LedgerRow[];
          billing?: { message?: string };
        }>(`/api/orgs/${orgId}/billing`),
        apiJson<{ keys: ApiKeyRow[] }>(`/api/orgs/${orgId}/api-keys`),
        apiJson<{ configs: EmbedConfig[] }>(`/api/orgs/${orgId}/embed`).catch(() => ({
          configs: [] as EmbedConfig[],
        })),
      ]);
      setCreditBalanceCents(billing.creditBalanceCents);
      setLedger(billing.ledger ?? []);
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

  const submitPassword = async () => {
    setPasswordMessage(null);
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    const result = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Password updated. Other sessions were signed out.');
  };

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
            <User size={18} />
            Account
          </h3>
          <div className="space-y-3">
            <div>
              <label className="vfy-label">Name</label>
              <input className="vfy-field-input" value={accountName} readOnly aria-label="Account name" />
            </div>
            <div>
              <label className="vfy-label">Email</label>
              <input className="vfy-field-input" value={accountEmail} readOnly aria-label="Account email" />
            </div>
            <p className="vfy-settings-help">
              Workspace ID: <code>{orgId ?? '—'}</code>
            </p>
          </div>
        </section>
      )}

      {showBilling && (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <Lock size={18} />
            Password
          </h3>
          <div className="space-y-3">
            <input
              className="vfy-field-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              aria-label="Current password"
            />
            <input
              className="vfy-field-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              aria-label="New password"
            />
            <input
              className="vfy-field-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              aria-label="Confirm new password"
            />
            <button
              type="button"
              className="vfy-btn vfy-btn-primary"
              disabled={busy || !currentPassword || !newPassword}
              onClick={() => void submitPassword()}
            >
              Update password
            </button>
            {passwordMessage && (
              <p className="text-sm" style={{ color: 'var(--d-accent)' }} role="status">
                {passwordMessage}
              </p>
            )}
          </div>
        </section>
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
            Balance updates when voice turns debit usage (STT, LLM, TTS) and when an admin grants
            credits. This is the live org balance from Postgres, not a demo counter.
          </p>
          <p className="vfy-settings-help">
            Need keys for your backend or website? Open{' '}
            <Link to="/dashboard/api-keys" style={{ color: 'var(--d-accent)' }}>
              API keys
            </Link>
            .
          </p>

          <h4 className="vfy-label" style={{ marginTop: 16 }}>
            Recent ledger
          </h4>
          <ul className="vfy-settings-list">
            {ledger.length === 0 && (
              <li className="vfy-settings-empty">No credit movements yet.</li>
            )}
            {ledger.slice(0, 12).map((row) => (
                <li key={row.id} className="vfy-settings-list-item">
                  <div>
                    <p className="vfy-settings-item-title">
                      {row.deltaCents >= 0 ? '+' : ''}
                      {(row.deltaCents / 100).toFixed(2)} USD
                    </p>
                    <p className="vfy-settings-item-meta">
                      {row.reason} · {new Date(row.createdAt).toLocaleString()} · bal $
                      {(row.balanceAfter / 100).toFixed(2)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
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
