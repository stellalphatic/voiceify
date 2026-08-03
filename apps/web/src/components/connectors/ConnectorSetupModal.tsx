import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  buildConnectorInstallPayload,
  type ConnectorDef,
} from '../../lib/connectors/catalog';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { BrandIcon } from './BrandIcons';
import Modal from '../dashboard/Modal';

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
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={`Connect · ${connector.category}`}
      title={connector.name}
      icon={<BrandIcon brand={connector.brand} size={26} />}
      footer={
        <>
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
        </>
      }
    >
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
    </Modal>
  );
}
