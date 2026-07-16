import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Play, Sparkles } from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import WorkflowCanvas from './WorkflowCanvas';

type Pack = {
  id: string;
  name: string;
  description?: string;
  installed?: boolean;
};

type AutomationsPayload = {
  installs: Array<{ id: string; packId: string; createdAt: string }>;
  available: Pack[];
};

export default function WorkflowsWorkspace() {
  const orgId = getActiveOrgId();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const data = await apiJson<AutomationsPayload>(`/api/orgs/${orgId}/automations`);
      setPacks(data.available);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (packId: string) => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiJson(`/api/orgs/${orgId}/automations/install`, {
        method: 'POST',
        body: JSON.stringify({ packId, createAgent: true }),
      });
      setMessage(`Installed ${packId}. Agent and tools are ready to use in Sandbox.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// configure · workflows</p>
          <h1 className="vfy-page-title">Workflows</h1>
          <p className="vfy-page-sub">
            Design conversation graphs with drag-and-drop nodes and connecting lines, then install
            vertical packs that seed tools and agents for Sandbox.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm" role="status" style={{ color: 'var(--d-accent)' }}>
          {message}
        </p>
      )}

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <GitBranch size={18} />
          Conversation flow canvas
        </h3>
        <WorkflowCanvas />
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Sparkles size={18} />
          Automation packs
        </h3>
        <div className="vfy-tools-grid">
          {packs.map((p) => (
            <div key={p.id} className="vfy-tools-card" style={{ cursor: 'default' }}>
              <span className="vfy-tools-card-icon">
                <Play size={18} />
              </span>
              <span className="vfy-tools-card-title">
                {p.name}
                {p.installed && <span className="vfy-tag">Installed</span>}
              </span>
              <span className="vfy-tools-card-desc">
                {p.description ?? 'Production-ready vertical workflow pack.'}
              </span>
              <button
                type="button"
                className="vfy-btn vfy-btn-primary"
                disabled={busy || !orgId || p.installed}
                onClick={() => void install(p.id)}
                style={{ marginTop: 8 }}
              >
                {p.installed ? 'Ready' : 'Install pack'}
              </button>
            </div>
          ))}
          {packs.length === 0 && (
            <p className="vfy-settings-empty">No packs available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
