import { useEffect, useRef, useState } from 'react';
import type { AppAgent } from '../../lib/agents/AgentStoreContext';
import { validateAgentName } from '../../lib/dashboard/settings';

const AGENT_TYPES = [
  'Healthcare',
  'Real Estate',
  'Customer Service',
  'Education',
  'Hospitality',
  'General',
] as const;

const VOICES = [
  { id: 'Puck', label: 'Puck — energetic' },
  { id: 'Charon', label: 'Charon — deep' },
  { id: 'Kore', label: 'Kore — soft' },
  { id: 'Fenrir', label: 'Fenrir — rough' },
  { id: 'Zephyr', label: 'Zephyr — calm' },
] as const;

type AgentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: AppAgent) => void;
  initialData?: AppAgent | null;
};

export default function AgentModal({ isOpen, onClose, onSave, initialData }: AgentModalProps) {
  const isEdit = Boolean(initialData);
  const backdropRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(AGENT_TYPES[0]);
  const [language, setLanguage] = useState('English');
  const [status, setStatus] = useState('Active');
  const [voice, setVoice] = useState('Puck');
  const [greeting, setGreeting] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    openedAtRef.current = Date.now();
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type || AGENT_TYPES[0]);
      setLanguage(initialData.language || 'English');
      setStatus(initialData.status || 'Active');
      setVoice(initialData.voice || 'Puck');
      setGreeting(initialData.greeting || '');
    } else {
      setName('');
      setType(AGENT_TYPES[0]);
      setLanguage('English');
      setStatus('Active');
      setVoice('Puck');
      setGreeting('');
    }
    setNameError(undefined);
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (Date.now() - openedAtRef.current < 200) return;
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateAgentName(name);
    if (nameErr) {
      setNameError(nameErr);
      return;
    }
    const trimmed = name.trim();

    onSave({
      name: trimmed,
      type,
      language,
      status,
      voice,
      greeting: greeting.trim(),
      capabilities: initialData?.capabilities ?? [],
      triggers: initialData?.triggers ?? [],
      tasks: initialData?.tasks ?? [],
      id: initialData?.id ?? Date.now(),
      createdAt: initialData?.createdAt ?? new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="vfy-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
      onPointerDown={handleBackdropPointerDown}
    >
      <div className="vfy-modal" onPointerDown={(e) => e.stopPropagation()}>
        <div className="vfy-modal-head">
          <p className="vfy-modal-eyebrow">{isEdit ? '// edit agent' : '// new agent'}</p>
          <h2 className="vfy-modal-title" id="agent-modal-title">
            {isEdit ? 'Edit agent' : 'Create agent'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="vfy-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="vfy-label" htmlFor="agent-name">
                Name
              </label>
              <input
                id="agent-name"
                className="vfy-field-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(undefined);
                }}
                placeholder="e.g. Front desk"
                autoFocus
                autoComplete="off"
              />
              {nameError && (
                <p className="text-xs mt-1" style={{ color: 'var(--d-danger)' }} role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="vfy-label" htmlFor="agent-type">
                Type
              </label>
              <select
                id="agent-type"
                className="vfy-field-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {AGENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="vfy-settings-row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="vfy-label" htmlFor="agent-language">
                  Language
                </label>
                <select
                  id="agent-language"
                  className="vfy-field-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                  <option value="English/Urdu">English / Urdu</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="vfy-label" htmlFor="agent-voice">
                  Voice
                </label>
                <select
                  id="agent-voice"
                  className="vfy-field-select"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="vfy-label" htmlFor="agent-status">
                  Status
                </label>
                <select
                  id="agent-status"
                  className="vfy-field-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            <div>
              <label className="vfy-label" htmlFor="agent-greeting">
                Greeting <span style={{ color: 'var(--d-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="agent-greeting"
                className="vfy-field-input"
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="What should the agent say when a session starts?"
                style={{ resize: 'vertical', minHeight: 72 }}
              />
            </div>

            {!isEdit && (
              <p className="text-xs" style={{ color: 'var(--d-muted)', margin: 0, lineHeight: 1.5 }}>
                You can add capabilities, triggers, and tasks from the agent detail page after creation.
              </p>
            )}
          </div>

          <div className="vfy-modal-foot">
            <button type="button" className="vfy-btn vfy-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="vfy-btn vfy-btn-primary">
              {isEdit ? 'Save changes' : 'Create agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
