import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

/**
 * Every field here is read by the turn pipeline in apps/api/src/routes/voice.ts.
 * Controls that could only be stored and never enforced were removed rather than
 * left on screen implying protection the runtime does not provide.
 */
type GuardrailsState = {
  blockPii: boolean;
  stayOnTopic: boolean;
  noMedicalAdvice: boolean;
  blockProfanity: boolean;
  refuseJailbreak: boolean;
  allowTools: boolean;
  maxReplySeconds: number;
  temperatureStrictness: 'strict' | 'balanced' | 'creative';
  blockedTopics: string;
  allowedLanguages: string[];
};

const DEFAULTS: GuardrailsState = {
  blockPii: true,
  stayOnTopic: true,
  noMedicalAdvice: true,
  blockProfanity: true,
  refuseJailbreak: true,
  allowTools: true,
  maxReplySeconds: 12,
  temperatureStrictness: 'balanced',
  blockedTopics: '',
  allowedLanguages: ['en', 'ur', 'auto', 'ar', 'hi', 'es'],
};

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'auto', label: 'Auto-detect' },
] as const;

type ServerAgentRow = { id: string; guardrails?: Partial<GuardrailsState> | null };

export default function GuardrailsWorkspace() {
  const { agents } = useAgentStore();
  const serverAgents = agents;
  const [agentId, setAgentId] = useState<number | ''>(serverAgents[0]?.id ?? '');
  const selected = useMemo(
    () => serverAgents.find((a) => a.id === agentId) ?? null,
    [serverAgents, agentId],
  );
  const [form, setForm] = useState<GuardrailsState>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  /*
   * Read the policy the runtime actually enforces. This used to load from
   * localStorage, so a second browser showed defaults that contradicted what
   * was stored on the agent while claiming to be "synced to server".
   */
  const serverId = selected?.serverId;
  useEffect(() => {
    setSaved(false);
    setError(null);
    if (!serverId) {
      setForm(DEFAULTS);
      return;
    }

    const orgId = getActiveOrgId();
    if (!orgId) {
      setForm(DEFAULTS);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await apiJson<{ agents: ServerAgentRow[] }>(
          `/api/orgs/${orgId}/agents`,
        );
        if (cancelled) return;
        const row = data.agents.find((a) => a.id === serverId);
        setForm({ ...DEFAULTS, ...(row?.guardrails ?? {}) });
      } catch {
        if (!cancelled) setForm(DEFAULTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const save = () => {
    const orgId = getActiveOrgId();
    if (!orgId || !serverId) {
      setError('Save this agent to your workspace before setting guardrails.');
      return;
    }

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await apiJson(`/api/orgs/${orgId}/agents/${serverId}`, {
          method: 'PATCH',
          body: JSON.stringify({ guardrails: form }),
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save guardrails');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Configure · Guardrails</p>
          <h1 className="vfy-page-title">Guardrails</h1>
          <p className="vfy-page-sub">
            Advanced policy controls for PII, topic bounds, tool limits, jailbreak refusal, and
            multilingual allow-lists. Pair with Knowledge for grounded answers.
          </p>
        </div>
      </div>

      {serverAgents.length === 0 ? (
        <section className="vfy-settings-card">
          <p className="vfy-settings-help">Create an agent first, then configure guardrails.</p>
          <Link to="/dashboard/agents" className="vfy-btn vfy-btn-primary">
            Go to agents
          </Link>
        </section>
      ) : (
        <section className="vfy-settings-card">
          <h3 className="vfy-settings-card-title">
            <ShieldAlert size={18} />
            Policy for agent
          </h3>
          <select
            className="vfy-field-select"
            value={agentId}
            onChange={(e) => setAgentId(Number(e.target.value))}
            aria-label="Select agent"
          >
            {serverAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="space-y-3" style={{ marginTop: 16 }}>
            <p className="vfy-label" style={{ marginBottom: 0 }}>
              Safety toggles
            </p>
            {(
              [
                ['blockPii', 'Warn against collecting full card numbers / SSN'],
                ['stayOnTopic', 'Stay within the agent type and knowledge base'],
                ['noMedicalAdvice', 'Refuse diagnosis or prescribing language'],
                ['blockProfanity', 'Redirect when callers use abusive language'],
                ['refuseJailbreak', 'Refuse prompt-injection / “ignore instructions” attempts'],
                ['allowTools', 'Allow this agent to run connected tools'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="vfy-check-row">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}

            <div>
              <label className="vfy-label" htmlFor="max-reply">
                Max spoken reply (seconds)
              </label>
              <input
                id="max-reply"
                type="number"
                min={4}
                max={45}
                className="vfy-field-input"
                value={form.maxReplySeconds}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxReplySeconds: Number(e.target.value) || 12 }))
                }
              />
            </div>

            <div>
              <label className="vfy-label" htmlFor="strictness">
                Response strictness
              </label>
              <select
                id="strictness"
                className="vfy-field-select"
                value={form.temperatureStrictness}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    temperatureStrictness: e.target.value as GuardrailsState['temperatureStrictness'],
                  }))
                }
              >
                <option value="strict">Strict (safer, shorter)</option>
                <option value="balanced">Balanced</option>
                <option value="creative">Creative (more flexible)</option>
              </select>
            </div>

            <div>
              <label className="vfy-label" htmlFor="blocked-topics">
                Blocked topics
              </label>
              <textarea
                id="blocked-topics"
                className="vfy-field-textarea"
                rows={3}
                value={form.blockedTopics}
                onChange={(e) => setForm((f) => ({ ...f, blockedTopics: e.target.value }))}
                placeholder="Comma-separated topics to refuse, e.g. politics, competitor pricing"
              />
            </div>

            <div>
              <label className="vfy-label">Allowed languages</label>
              <p className="vfy-settings-help">
                Callers can switch among enabled languages. Auto-detect covers multilingual sessions.
              </p>
              <div className="vfy-tag-list">
                {LANG_OPTIONS.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    className={`vfy-tag${form.allowedLanguages.includes(code) ? ' is-on' : ''}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        allowedLanguages: f.allowedLanguages.includes(code)
                          ? f.allowedLanguages.filter((c) => c !== code)
                          : [...f.allowedLanguages, code],
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="vfy-btn vfy-btn-primary"
              disabled={busy || loading}
              onClick={save}
            >
              {busy ? 'Saving…' : 'Save guardrails'}
            </button>
            {error && (
              <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
                {error}
              </p>
            )}
            {saved && !error && (
              <p className="text-sm" style={{ color: 'var(--d-accent)' }}>
                Guardrails saved for {selected?.name}.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
