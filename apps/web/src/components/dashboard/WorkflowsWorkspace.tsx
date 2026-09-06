import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Sparkles, Utensils, Headphones, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';
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

const PACK_ICONS: Record<string, typeof Utensils> = {
  restaurant: Utensils,
  receptionist: Headphones,
  appointments: CalendarDays,
};

export default function WorkflowsWorkspace() {
  const orgId = getActiveOrgId();
  const { agents, refreshFromApi } = useAgentStore();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  useEffect(() => {
    if (selectedAgentId && agents.some((agent) => agent.serverId === selectedAgentId)) return;
    setSelectedAgentId(agents.find((agent) => agent.serverId)?.serverId ?? '');
  }, [agents, selectedAgentId]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const auto = await apiJson<AutomationsPayload>(
        `/api/orgs/${orgId}/automations`,
      );
      setPacks(auto.available);
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
      setMessage(`Installed ${packId}. Agent and pack tools are ready in Agents and Sandbox.`);
      await Promise.all([load(), refreshFromApi()]);
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
          <p className="vfy-page-eyebrow">Configure · Workflows</p>
          <h1 className="vfy-page-title">Workflows</h1>
          <p className="vfy-page-sub">
            Design conversation graphs with Sheets, WhatsApp, Calendar, and Email nodes. Install
            vertical packs for Restaurant, Receptionist, and Appointments.
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
        <h3 className="vfy-settings-card-title">Tools used by workflows</h3>
        <p className="vfy-settings-help">
          Configure HTTP actions and business connectors once under Tools, then reference them in
          your workflow.
        </p>
        <Link to="/dashboard/tools" className="vfy-btn vfy-btn-ghost">
          Manage tools and connectors
        </Link>
        <label className="vfy-field" style={{ display: 'block', marginTop: 16 }}>
          <span className="vfy-field-label">Workflow agent</span>
          <select
            className="vfy-field-select"
            value={selectedAgentId}
            onChange={(event) => setSelectedAgentId(event.target.value)}
          >
            <option value="">Select an agent</option>
            {agents
              .filter((agent) => agent.serverId)
              .map((agent) => (
                <option key={agent.serverId} value={agent.serverId}>
                  {agent.name}
                </option>
              ))}
          </select>
        </label>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <GitBranch size={18} />
          Conversation flow canvas
        </h3>
        <WorkflowCanvas agentId={selectedAgentId || undefined} />
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Sparkles size={18} />
          Automation packs
        </h3>
        <div className="vfy-tools-grid">
          {packs.map((p) => {
            const Icon = PACK_ICONS[p.id] ?? Sparkles;
            return (
              <div key={p.id} className="vfy-tools-card vfy-connector-card" style={{ cursor: 'default' }}>
                <span className="vfy-connector-icon">
                  <Icon size={22} />
                </span>
                <span className="vfy-tools-card-title">
                  {p.name}
                  {p.installed && <span className="vfy-tag vfy-tag--ok">Installed</span>}
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
            );
          })}
          {packs.length === 0 && (
            <p className="vfy-settings-empty">No packs available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
