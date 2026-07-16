import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

type ConversationRow = {
  id: string;
  agentId: string | null;
  status: string;
  channel: string;
  startedAt: string;
  endedAt?: string | null;
  latencyMs?: number | null;
};

export default function ConversationsWorkspace() {
  const orgId = getActiveOrgId();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    conversation: ConversationRow;
    messages: Array<{ role: string; content: string; createdAt: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setError(null);
    try {
      const data = await apiJson<{ conversations: ConversationRow[] }>(
        `/api/orgs/${orgId}/conversations`,
      );
      setRows(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    if (!orgId) return;
    setSelectedId(id);
    try {
      const data = await apiJson<{
        conversation: ConversationRow;
        messages: Array<{ role: string; content: string; createdAt: string }>;
      }>(`/api/orgs/${orgId}/conversations/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  };

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.channel ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// monitor · conversations</p>
          <h1 className="vfy-page-title">Conversation history</h1>
          <p className="vfy-page-sub">
            Review live and completed agent turns, latency, and transcripts from your workspace.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}

      <div className="vfy-settings-row">
        <Search size={16} style={{ color: 'var(--d-muted)' }} />
        <input
          className="vfy-field-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          aria-label="Search conversations"
        />
        <Link to="/dashboard/sandbox" className="vfy-btn vfy-btn-primary">
          Open sandbox
        </Link>
      </div>

      <div className="vfy-conv-layout">
        <section className="vfy-settings-card" style={{ margin: 0 }}>
          <table className="vfy-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Channel</th>
                <th>Started</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="vfy-settings-empty">
                    No conversations yet. Run a turn in Sandbox to populate history.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'is-active' : undefined}
                  onClick={() => void openDetail(r.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="vfy-tag">{r.status}</span>
                  </td>
                  <td>{r.channel}</td>
                  <td>{new Date(r.startedAt).toLocaleString()}</td>
                  <td>{r.latencyMs != null ? `${r.latencyMs} ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="vfy-settings-card" style={{ margin: 0 }}>
          <h3 className="vfy-settings-card-title">
            <MessageSquare size={18} />
            Transcript
          </h3>
          {!detail && <p className="vfy-settings-empty">Select a conversation to inspect messages.</p>}
          {detail && (
            <ul className="vfy-settings-list">
              {detail.messages.map((m, i) => (
                <li key={`${m.createdAt}-${i}`} className="vfy-settings-list-item">
                  <div>
                    <p className="vfy-settings-item-title">{m.role}</p>
                    <p className="vfy-settings-item-meta" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </p>
                  </div>
                </li>
              ))}
              {detail.messages.length === 0 && (
                <li className="vfy-settings-empty">No messages stored for this conversation.</li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
