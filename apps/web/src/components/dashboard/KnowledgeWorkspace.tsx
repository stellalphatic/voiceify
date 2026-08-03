import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  FileText,
  Globe,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

type KnowledgeDoc = {
  id: string;
  title: string;
  filename: string;
  status: string;
  createdAt: string;
  agentIds?: string[];
};

type AgentOption = { id: string; name: string };

/** `all` mirrors an empty agentIds array on the server: every agent may retrieve the doc. */
type AgentScope = { mode: 'all' | 'specific'; agentIds: string[] };

const EMPTY_SCOPE: AgentScope = { mode: 'specific', agentIds: [] };

function scopeToAgentIds(scope: AgentScope): string[] {
  return scope.mode === 'all' ? [] : scope.agentIds;
}

function scopeIsIncomplete(scope: AgentScope): boolean {
  return scope.mode === 'specific' && scope.agentIds.length === 0;
}

function docToScope(doc: KnowledgeDoc): AgentScope {
  const ids = doc.agentIds ?? [];
  return ids.length === 0 ? { mode: 'all', agentIds: [] } : { mode: 'specific', agentIds: ids };
}

function describeScope(
  scope: AgentScope,
  agents: AgentOption[],
  prefix: string,
): string {
  if (scope.mode === 'all') return `${prefix} Available to every agent.`;
  const names = scope.agentIds
    .map((id) => agents.find((a) => a.id === id)?.name ?? 'agent')
    .join(', ');
  return `${prefix} Linked to ${names}.`;
}

function AgentScopePicker({
  agents,
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  agents: AgentOption[];
  value: AgentScope;
  onChange: (next: AgentScope) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const toggle = (agentId: string) => {
    const next = value.agentIds.includes(agentId)
      ? value.agentIds.filter((id) => id !== agentId)
      : [...value.agentIds, agentId];
    onChange({ mode: 'specific', agentIds: next });
  };

  return (
    <div className="vfy-scope">
      <p className="vfy-scope-label">Which agents can use this document?</p>
      <div className="vfy-scope-modes" role="radiogroup" aria-label="Document access">
        <label
          className={`vfy-scope-mode${value.mode === 'specific' ? ' is-active' : ''}`}
          htmlFor={`${idPrefix}-specific`}
        >
          <input
            id={`${idPrefix}-specific`}
            type="radio"
            name={`${idPrefix}-mode`}
            checked={value.mode === 'specific'}
            disabled={disabled}
            onChange={() => onChange({ mode: 'specific', agentIds: value.agentIds })}
          />
          <Bot size={14} />
          Selected agents
        </label>
        <label
          className={`vfy-scope-mode${value.mode === 'all' ? ' is-active' : ''}`}
          htmlFor={`${idPrefix}-all`}
        >
          <input
            id={`${idPrefix}-all`}
            type="radio"
            name={`${idPrefix}-mode`}
            checked={value.mode === 'all'}
            disabled={disabled}
            onChange={() => onChange({ mode: 'all', agentIds: value.agentIds })}
          />
          <Users size={14} />
          Every agent
        </label>
      </div>

      {value.mode === 'specific' && (
        <>
          {agents.length === 0 ? (
            <p className="vfy-settings-help">
              No agents yet. Create an agent first, or share this document with every agent.
            </p>
          ) : (
            <div className="vfy-scope-chips">
              {agents.map((agent) => {
                const selected = value.agentIds.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    className={`vfy-scope-chip${selected ? ' is-selected' : ''}`}
                    onClick={() => toggle(agent.id)}
                  >
                    {selected ? <Check size={13} /> : <Bot size={13} />}
                    {agent.name}
                  </button>
                );
              })}
            </div>
          )}
          {scopeIsIncomplete(value) && agents.length > 0 && (
            <p className="vfy-settings-help">Pick at least one agent to continue.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function KnowledgeWorkspace() {
  const orgId = getActiveOrgId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadScope, setUploadScope] = useState<AgentScope>(EMPTY_SCOPE);
  const [pasteScope, setPasteScope] = useState<AgentScope>(EMPTY_SCOPE);
  /** Holds in-flight edits so switching to "Selected agents" does not snap back before a pick. */
  const [docScopes, setDocScopes] = useState<Record<string, AgentScope>>({});
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Array<{ content: string; docId: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const [docsData, agentsData] = await Promise.all([
        apiJson<{ docs: KnowledgeDoc[] }>(`/api/orgs/${orgId}/knowledge`),
        apiJson<{ agents: Array<{ id: string; name: string }> }>(
          `/api/orgs/${orgId}/agents`,
        ),
      ]);
      setDocs(docsData.docs);
      setAgents(agentsData.agents.map((a) => ({ id: a.id, name: a.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge base');
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createDoc = async () => {
    if (!orgId || !title.trim() || !content.trim()) return;
    if (scopeIsIncomplete(pasteScope)) {
      setError('Select which agents should use this document.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiJson(`/api/orgs/${orgId}/knowledge`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          agentIds: scopeToAgentIds(pasteScope),
        }),
      });
      setTitle('');
      setContent('');
      setPasteScope(EMPTY_SCOPE);
      setMessage(describeScope(pasteScope, agents, 'Text ingested, chunked, and embedded.'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest document');
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!orgId) return;
    if (scopeIsIncomplete(uploadScope)) {
      setError('Select which agents should use this document before uploading.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (uploadTitle.trim()) form.append('title', uploadTitle.trim());
      const scopedIds = scopeToAgentIds(uploadScope);
      if (scopedIds.length) form.append('agentIds', scopedIds.join(','));
      const data = await apiJson<{
        chunks: number;
        discardedOriginal?: boolean;
        note?: string;
      }>(`/api/orgs/${orgId}/knowledge/upload`, {
        method: 'POST',
        body: form,
      });
      setUploadTitle('');
      if (fileRef.current) fileRef.current.value = '';
      setMessage(
        describeScope(
          uploadScope,
          agents,
          data.note ??
            `Extracted and indexed ${data.chunks} chunks. Original file discarded after embedding.`,
        ),
      );
      setUploadScope(EMPTY_SCOPE);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = async (docId: string) => {
    if (!orgId) return;
    if (!window.confirm('Delete this document and its chunks?')) return;
    setBusy(true);
    try {
      await apiJson(`/api/orgs/${orgId}/knowledge/${docId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const assignAgents = async (docId: string, agentIds: string[]) => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/orgs/${orgId}/knowledge/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ agentIds }),
      });
      setMessage(
        agentIds.length
          ? `Document linked to ${agentIds.length} agent${agentIds.length === 1 ? '' : 's'}.`
          : 'Document is now available to every agent.',
      );
      setDocScopes((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update agent assignment');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (!orgId || !query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{ hits: Array<{ content: string; docId: string }> }>(
        `/api/orgs/${orgId}/knowledge/search?q=${encodeURIComponent(query.trim())}`,
      );
      setHits(data.hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Configure · Knowledge</p>
          <h1 className="vfy-page-title">Knowledge base</h1>
          <p className="vfy-page-sub">
            Paste text or upload PDF/DOCX. We extract text, chunk it, embed it for retrieval, then
            discard the original file. Choose exactly which agents can use each document — nothing
            is shared workspace-wide unless you say so.
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

      <div className="vfy-kb-actions">
        <div className="vfy-kb-card">
          <Globe size={20} />
          <h3>Add text</h3>
          <p>Paste website copy, FAQs, or scripts.</p>
        </div>
        <div className="vfy-kb-card">
          <Upload size={20} />
          <h3>Upload PDF / DOCX</h3>
          <p>Extract, embed, store chunks, discard file.</p>
        </div>
        <div className="vfy-kb-card">
          <BookOpen size={20} />
          <h3>Ground agents</h3>
          <p>Hybrid keyword + embedding retrieval.</p>
        </div>
      </div>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Upload size={18} />
          Upload document
        </h3>
        <div className="space-y-3">
          <input
            className="vfy-field-input"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Optional title override"
            aria-label="Upload title"
          />
          <AgentScopePicker
            idPrefix="kb-upload"
            agents={agents}
            value={uploadScope}
            onChange={setUploadScope}
            disabled={busy}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            aria-label="Choose PDF or DOCX"
            disabled={busy || scopeIsIncomplete(uploadScope)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          <p className="vfy-settings-help">
            Max 8MB. Supported: PDF, DOCX, TXT. Original bytes are deleted after indexing.
          </p>
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Plus size={18} />
          Paste text
        </h3>
        <div className="space-y-3">
          <input
            className="vfy-field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            aria-label="Document title"
          />
          <textarea
            className="vfy-field-textarea"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste knowledge content here…"
            aria-label="Document content"
          />
          <AgentScopePicker
            idPrefix="kb-paste"
            agents={agents}
            value={pasteScope}
            onChange={setPasteScope}
            disabled={busy}
          />
          <button
            type="button"
            className="vfy-btn vfy-btn-primary"
            disabled={
              busy ||
              !orgId ||
              !title.trim() ||
              !content.trim() ||
              scopeIsIncomplete(pasteScope)
            }
            onClick={() => void createDoc()}
          >
            Upload to knowledge base
          </button>
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <Search size={18} />
          Test retrieval
        </h3>
        <div className="vfy-settings-row">
          <input
            className="vfy-field-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge base…"
            aria-label="Search knowledge"
          />
          <button
            type="button"
            className="vfy-btn vfy-btn-ghost"
            disabled={busy || !orgId || !query.trim()}
            onClick={() => void search()}
          >
            Search
          </button>
        </div>
        <ul className="vfy-settings-list">
          {hits.length === 0 && <li className="vfy-settings-empty">No hits yet. Run a search.</li>}
          {hits.map((h, i) => (
            <li key={`${h.docId}-${i}`} className="vfy-settings-list-item">
              <p className="vfy-settings-item-meta" style={{ whiteSpace: 'pre-wrap' }}>
                {h.content.slice(0, 320)}
                {h.content.length > 320 ? '…' : ''}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <FileText size={18} />
          Documents
        </h3>
        <ul className="vfy-settings-list">
          {docs.length === 0 && (
            <li className="vfy-settings-empty">No documents yet. Upload your first source above.</li>
          )}
          {docs.map((d) => (
            <li key={d.id} className="vfy-settings-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                <div>
                  <p className="vfy-settings-item-title">{d.title}</p>
                  <p className="vfy-settings-item-meta">
                    {d.filename} · {d.status} · {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="vfy-tag">{d.status}</span>
                  <button
                    type="button"
                    className="vfy-btn vfy-btn-ghost"
                    disabled={busy}
                    onClick={() => void removeDoc(d.id)}
                    aria-label={`Delete ${d.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <AgentScopePicker
                idPrefix={`kb-doc-${d.id}`}
                agents={agents}
                value={docScopes[d.id] ?? docToScope(d)}
                onChange={(next) => {
                  setDocScopes((prev) => ({ ...prev, [d.id]: next }));
                  if (!scopeIsIncomplete(next)) void assignAgents(d.id, scopeToAgentIds(next));
                }}
                disabled={busy}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
