import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAgentStore } from '../../lib/agents/AgentStoreContext';

type GuardrailsState = {
  blockPii: boolean;
  stayOnTopic: boolean;
  noMedicalAdvice: boolean;
  maxReplySeconds: number;
  allowedLanguages: string[];
};

const DEFAULTS: GuardrailsState = {
  blockPii: true,
  stayOnTopic: true,
  noMedicalAdvice: true,
  maxReplySeconds: 12,
  allowedLanguages: ['en', 'ur', 'auto'],
};

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
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// configure · guardrails</p>
          <h1 className="vfy-page-title">Guardrails</h1>
          <p className="vfy-page-sub">
            Keep agents on-policy with topic bounds, language limits, PII caution, and reply
            length caps. Pair with Knowledge base for grounded answers.
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
            {(
              [
                ['blockPii', 'Warn against collecting full card numbers / SSN'],
                ['stayOnTopic', 'Stay within the agent type and knowledge base'],
                ['noMedicalAdvice', 'Refuse diagnosis or prescribing language'],
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
                max={30}
                className="vfy-field-input"
                value={form.maxReplySeconds}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxReplySeconds: Number(e.target.value) || 12 }))
                }
              />
            </div>

            <div>
              <label className="vfy-label">Allowed languages</label>
              <p className="vfy-settings-help">
                English, Urdu, and auto-detect are enabled for bilingual callers.
              </p>
              <div className="vfy-tag-list">
                {['en', 'ur', 'auto'].map((code) => (
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
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="vfy-btn vfy-btn-primary" onClick={save}>
              Save guardrails
            </button>
            {saved && (
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
