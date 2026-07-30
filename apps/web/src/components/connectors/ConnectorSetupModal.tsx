import { useEffect, useId, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import {
  buildConnectorInstallPayload,
  type ConnectorDef,
} from '../../lib/connectors/catalog';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { BrandIcon } from './BrandIcons';

type Props = {
  connector: ConnectorDef;
  open: boolean;
  onClose: () => void;
  onInstalled: () => void;
};

export default function ConnectorSetupModal({
  connector,
  open,
  onClose,
  onInstalled,
}: Props) {
  const orgId = getActiveOrgId();
  const titleId = useId();
  const [url, setUrl] = useState(String(connector.template.config.url ?? ''));
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUrl(String(connector.template.config.url ?? ''));
    setToken('');
    setError(null);
    setDone(false);
  }, [open, connector]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!orgId) {
      setError('Select a workspace first.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setError('Enter a full https:// URL for the connector.');
      return;
    }
    if (connector.fields.some((f) => f.key === 'token') && !token.trim()) {
      setError('Access token is required for this connector.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = buildConnectorInstallPayload(connector, { url, token });
      await apiJson(`/api/orgs/${orgId}/tools`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDone(true);
      onInstalled();
      window.setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="vfy-modal-backdrop vfy-modal-backdrop--animate"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="vfy-modal vfy-modal--wide vfy-modal--animate"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="vfy-modal-head" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span className="vfy-connector-icon vfy-connector-icon--lg">
            <BrandIcon brand={connector.brand} size={28} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="vfy-modal-eyebrow">// connect · {connector.category}</p>
            <h2 id={titleId} className="vfy-modal-title">
              {connector.name}
            </h2>
          </div>
          <button
            type="button"
            className="vfy-btn vfy-btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="vfy-modal-body">
          <p style={{ marginTop: 0 }}>{connector.description}</p>

          <ol className="vfy-connector-steps">
            {connector.setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {connector.fields.map((field) => (
            <label key={field.key} className="vfy-field" style={{ display: 'block', marginTop: 14 }}>
              <span className="vfy-field-label">{field.label}</span>
              <input
                className="vfy-field-input"
                type={field.key === 'token' ? 'password' : 'url'}
                value={field.key === 'token' ? token : url}
                onChange={(e) =>
                  field.key === 'token' ? setToken(e.target.value) : setUrl(e.target.value)
                }
                placeholder={field.placeholder}
                autoComplete="off"
              />
              {field.help ? <span className="vfy-settings-item-meta">{field.help}</span> : null}
            </label>
          ))}

          {error && (
            <p role="alert" className="text-sm" style={{ color: 'var(--d-danger)', marginTop: 12 }}>
              {error}
            </p>
          )}
          {done && (
            <p
              role="status"
              className="text-sm"
              style={{
                color: 'var(--d-accent)',
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={14} />
              Connected. Ready for Sandbox and workflows.
            </p>
          )}
        </div>

        <div className="vfy-modal-foot">
          <button type="button" className="vfy-btn vfy-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vfy-btn vfy-btn-primary"
            disabled={busy || done || !orgId}
            onClick={() => void submit()}
          >
            {busy ? 'Connecting…' : done ? 'Connected' : 'Connect to workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
