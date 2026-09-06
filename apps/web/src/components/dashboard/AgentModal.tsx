import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Mic2 } from 'lucide-react';
import type { AppAgent } from '../../lib/agents/AgentStoreContext';
import { validateAgentName } from '../../lib/dashboard/settings';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import Modal from './Modal';

const AGENT_TYPES = [
  'Healthcare',
  'Real Estate',
  'Customer Service',
  'Education',
  'Hospitality',
  'General',
] as const;

/** Display labels persisted on the agent; STT mode is derived via resolveLanguageMode. */
const LANGUAGE_OPTIONS = [
  { value: 'Multilingual', label: 'Multilingual (auto-detect)' },
  { value: 'English/Urdu', label: 'English + Urdu (mixed)' },
  { value: 'English', label: 'English' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Chinese', label: 'Chinese (Mandarin)' },
] as const;

const FALLBACK_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah — clear, warm', accent: 'American', language: 'en' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel — professional', accent: 'American', language: 'en' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — steady', accent: 'American', language: 'en' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold — deep', accent: 'American', language: 'en' },
  { id: 'ThT5KcBeYPX3keUQqHPh', label: 'Dorothy — soft', accent: 'British', language: 'en' },
] as const;

type VoiceOption = {
  id: string;
  label: string;
  accent?: string;
  language?: string;
};

type AgentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: AppAgent) => void;
  initialData?: AppAgent | null;
};

export default function AgentModal({ isOpen, onClose, onSave, initialData }: AgentModalProps) {
  const isEdit = Boolean(initialData);
  const voicePickerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(AGENT_TYPES[0]);
  const [language, setLanguage] = useState('Multilingual');
  const [status, setStatus] = useState('Active');
  const [voice, setVoice] = useState<string>(FALLBACK_VOICES[0].id);
  const [greeting, setGreeting] = useState('');
  const [instructions, setInstructions] = useState('');
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [knowledgeDocIds, setKnowledgeDocIds] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<Array<{ id: string; name: string }>>([]);
  const [availableDocs, setAvailableDocs] = useState<Array<{ id: string; title: string }>>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [voices, setVoices] = useState<VoiceOption[]>([...FALLBACK_VOICES]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type || AGENT_TYPES[0]);
      setLanguage(initialData.language || 'Multilingual');
      setStatus(initialData.status || 'Active');
      setVoice(initialData.voice || FALLBACK_VOICES[0].id);
      setGreeting(initialData.greeting || '');
      setInstructions(initialData.instructions || '');
      setToolIds(initialData.toolIds ?? []);
      setKnowledgeDocIds(initialData.knowledgeDocIds ?? []);
    } else {
      setName('');
      setType(AGENT_TYPES[0]);
      setLanguage('Multilingual');
      setStatus('Active');
      setVoice(FALLBACK_VOICES[0].id);
      setGreeting('');
      setInstructions('');
      setToolIds([]);
      setKnowledgeDocIds([]);
    }
    setNameError(undefined);
    setVoiceOpen(false);
    setVoiceFilter('');
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const orgId = getActiveOrgId();
        const [data, toolsData, docsData] = await Promise.all([
          apiJson<{
          voices: Array<{
            id?: string;
            voice_id?: string;
            name: string;
            labels?: Record<string, string>;
          }>;
          }>('/api/voice/voices'),
          orgId
            ? apiJson<{ tools: Array<{ id: string; name: string }> }>(
                `/api/orgs/${orgId}/tools`,
              )
            : Promise.resolve({ tools: [] }),
          orgId
            ? apiJson<{ docs: Array<{ id: string; title: string }> }>(
                `/api/orgs/${orgId}/knowledge`,
              )
            : Promise.resolve({ docs: [] }),
        ]);
        if (cancelled) return;
        const mapped: VoiceOption[] = [];
        for (const v of data.voices ?? []) {
          const id = v.id ?? v.voice_id ?? '';
          if (!id) continue;
          const accent = v.labels?.accent;
          const lang = v.labels?.language;
          const bits = [v.name, accent, lang].filter(Boolean).join(' · ');
          mapped.push({ id, label: bits, accent, language: lang });
        }
        if (mapped.length) setVoices(mapped);
        setAvailableTools(toolsData.tools);
        setAvailableDocs(docsData.docs);
      } catch {
        /* keep fallback voices */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Voice combobox dismissal. Escape is marked handled so the dialog stays open
  // while a popper is showing.
  useEffect(() => {
    if (!isOpen || !voiceOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setVoiceOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (!voicePickerRef.current?.contains(e.target as Node)) setVoiceOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [isOpen, voiceOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
      instructions: instructions.trim(),
      toolIds,
      knowledgeDocIds,
      capabilities: initialData?.capabilities ?? [],
      triggers: initialData?.triggers ?? [],
      tasks: initialData?.tasks ?? [],
      id: initialData?.id ?? Date.now(),
      // Without serverId the store cannot PATCH, so edits would never reach the API.
      serverId: initialData?.serverId,
      createdAt: initialData?.createdAt ?? new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const selectedVoice =
    voices.find((v) => v.id === voice) ??
    ({ id: voice, label: `Current · ${voice.slice(0, 12)}…` } satisfies VoiceOption);

  const filteredVoices = voices.filter((v) => {
    const q = voiceFilter.trim().toLowerCase();
    if (!q) return true;
    return `${v.label} ${v.accent ?? ''} ${v.language ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      eyebrow={isEdit ? 'Configure · Agent' : 'Create · Agent'}
      title={isEdit ? 'Edit agent' : 'Create agent'}
      description={
        isEdit
          ? 'Update the persona, voice, and language this agent uses on every call.'
          : 'Name your agent and pick the voice and language it answers calls with.'
      }
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="vfy-btn vfy-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="vfy-btn vfy-btn-primary">
            {isEdit ? 'Save changes' : 'Create agent'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

            <div>
              <label className="vfy-label" htmlFor="agent-language">
                Language
              </label>
              <select
                id="agent-language"
                className="vfy-field-select"
                value={
                  LANGUAGE_OPTIONS.some((o) => o.value === language) ? language : 'Multilingual'
                }
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="vfy-settings-help" style={{ marginTop: 6 }}>
                Multilingual lets callers switch languages mid-call. The agent follows the caller.
              </p>
            </div>

            <div ref={voicePickerRef} className="vfy-voice-picker">
              <label className="vfy-label" htmlFor="agent-voice-trigger">
                Voice
              </label>
              <button
                id="agent-voice-trigger"
                type="button"
                className="vfy-field-select"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
                aria-haspopup="listbox"
                aria-expanded={voiceOpen}
                onClick={() => setVoiceOpen((o) => !o)}
              >
                <Mic2 size={14} style={{ flexShrink: 0, color: 'var(--d-accent)' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedVoice.label}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
              </button>
              {voiceOpen && (
                <div className="vfy-voice-picker-list" role="listbox">
                  <input
                    className="vfy-field-input"
                    style={{ marginBottom: 6 }}
                    value={voiceFilter}
                    onChange={(e) => setVoiceFilter(e.target.value)}
                    placeholder="Filter voices…"
                    aria-label="Filter voices"
                    autoFocus
                  />
                  {filteredVoices.length === 0 && (
                    <p className="vfy-settings-help" style={{ padding: 8 }}>
                      No voices match.
                    </p>
                  )}
                  {filteredVoices.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      role="option"
                      aria-selected={v.id === voice}
                      className={`vfy-voice-picker-option${v.id === voice ? ' is-active' : ''}`}
                      onClick={() => {
                        setVoice(v.id);
                        setVoiceOpen(false);
                        setVoiceFilter('');
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
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
              <label className="vfy-label" htmlFor="agent-instructions">
                Instructions / system prompt
              </label>
              <textarea
                id="agent-instructions"
                className="vfy-field-textarea"
                rows={7}
                maxLength={20_000}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Define the agent's role, business rules, tone, escalation policy, and information it must never invent."
              />
              <p className="vfy-settings-help" style={{ marginTop: 6 }}>
                These instructions are compiled into an immutable version when you save.
              </p>
            </div>

            <div>
              <label className="vfy-label" htmlFor="agent-greeting">
                Greeting <span style={{ color: 'var(--d-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="agent-greeting"
                className="vfy-field-textarea"
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="What should the agent say when a session starts?"
              />
            </div>

            <div>
              <span className="vfy-label">Attached knowledge</span>
              <div className="vfy-scope-chips">
                {availableDocs.map((doc) => {
                  const selected = knowledgeDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      className={`vfy-scope-chip${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setKnowledgeDocIds((ids) =>
                          selected ? ids.filter((id) => id !== doc.id) : [...ids, doc.id],
                        )
                      }
                    >
                      {doc.title}
                    </button>
                  );
                })}
                {availableDocs.length === 0 && (
                  <p className="vfy-settings-help">No indexed documents are available yet.</p>
                )}
              </div>
            </div>

            <div>
              <span className="vfy-label">Attached tools</span>
              <div className="vfy-scope-chips">
                {availableTools.map((tool) => {
                  const selected = toolIds.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      className={`vfy-scope-chip${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setToolIds((ids) =>
                          selected ? ids.filter((id) => id !== tool.id) : [...ids, tool.id],
                        )
                      }
                    >
                      {tool.name}
                    </button>
                  );
                })}
                {availableTools.length === 0 && (
                  <p className="vfy-settings-help">No tools are available yet.</p>
                )}
              </div>
            </div>
      </div>
    </Modal>
  );
}
