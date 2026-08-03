import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

type GuardrailsState = {
  blockPii: boolean;
  stayOnTopic: boolean;
  noMedicalAdvice: boolean;
  blockProfanity: boolean;
  refuseJailbreak: boolean;
  requireToolConfirmation: boolean;
  escalateToHuman: boolean;
  maxReplySeconds: number;
  maxToolCallsPerTurn: number;
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
  requireToolConfirmation: false,
  escalateToHuman: true,
  maxReplySeconds: 12,
  maxToolCallsPerTurn: 2,
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

function storageKey(agentId: number) {
  return `voiceify.guardrails.${agentId}`;
}

function loadGuardrails(agentId: number): GuardrailsState {
  try {
    const raw = window.localStorage.getItem(storageKey(agentId));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GuardrailsState>) };
  } catch {
    return DEFAULTS;
  }
}

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

  useEffect(() => {
    if (typeof agentId === 'number') {
      setForm(loadGuardrails(agentId));
      setSaved(false);
    }
  }, [agentId]);

  const save = () => {
    if (typeof agentId !== 'number') return;
    window.localStorage.setItem(storageKey(agentId), JSON.stringify(form));
    setSaved(true);
    setError(null);

    const orgId = getActiveOrgId();
    const serverId = selected?.serverId;
    if (orgId && serverId) {
      setBusy(true);
      void (async () => {
        try {
          await apiJson(`/api/orgs/${orgId}/agents/${serverId}`, {
            method: 'PATCH',
            body: JSON.stringify({ guardrails: form }),
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Saved locally, but server sync failed',
          );
        } finally {
          setBusy(false);
        }
      })();
    }
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
                ['requireToolConfirmation', 'Ask before executing high-impact tools'],
                ['escalateToHuman', 'Offer human handoff when confidence is low'],
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

            <div className="vfy-settings-row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
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
              <div style={{ flex: 1 }}>
                <label className="vfy-label" htmlFor="max-tools">
                  Max tool calls / turn
                </label>
                <input
                  id="max-tools"
                  type="number"
                  min={0}
                  max={8}
                  className="vfy-field-input"
                  value={form.maxToolCallsPerTurn}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxToolCallsPerTurn: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
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
              disabled={busy}
              onClick={save}
            >
              Save guardrails
            </button>
            {error && (
              <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm" style={{ color: 'var(--d-accent)' }}>
                Guardrails saved for {selected?.name}
                {selected?.serverId ? ' (synced to server)' : ''}.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
