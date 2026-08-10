import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiJson, getActiveOrgId } from "../../lib/auth/client";

type ConversationRow = {
  id: string;
  status: string;
  channel: string;
  startedAt: string;
  endedAt?: string | null;
  latencyMs?: number | null;
  costEstimateCents?: number | null;
};

type AnalyticsPayload = {
  summary: {
    conversations: number;
    ended: number;
    errored: number;
    active: number;
    avgLatency: number | null;
    latencySamples: number;
    avgDurationSec: number | null;
    durationSamples: number;
    bestLatencyMs: number | null;
    messages: number;
    userTurns: number;
  };
  byDay: Array<{ day: string; total: number }>;
  byChannel: Array<{ channel: string; total: number }>;
  windowDays: number;
  recent: ConversationRow[];
  creditBalanceCents: number;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function AnalyticsDashboard() {
  const orgId = getActiveOrgId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setError("No workspace selected.");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const payload = await apiJson<AnalyticsPayload>(
          `/api/orgs/${orgId}/analytics`,
        );
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  /* Server groups by real date and channel, so these are only reshaped for recharts. */
  const byChannel = useMemo(
    () =>
      (data?.byChannel ?? []).map((row) => ({
        name: row.channel,
        value: row.total,
      })),
    [data],
  );

  const byDay = useMemo(
    () =>
      (data?.byDay ?? []).map((row) => ({
        day: new Date(`${row.day}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        conversations: row.total,
      })),
    [data],
  );

  const summary = data?.summary;
  const completionRate =
    summary && summary.conversations > 0
      ? Math.round((summary.ended / summary.conversations) * 100)
      : null;

  return (
    <div className="space-y-8">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Monitor · Analytics</p>
          <h1 className="vfy-page-title">Analytics</h1>
          <p className="vfy-page-sub">
            Measured from your conversation history. Metrics with no data yet show a
            dash rather than an estimate.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--d-danger)' }}>
          {error}
        </p>
      )}

      <section>
        <h2 className="vfy-settings-card-title" style={{ marginBottom: 12 }}>
          Conversation quality
        </h2>
        <div className="vfy-biz-grid">
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Completed conversations</p>
            <p className="vfy-biz-card-value">
              {loading
                ? '…'
                : completionRate == null
                  ? '—'
                  : `${completionRate}%`}
            </p>
            <p className="vfy-biz-card-note">
              {loading
                ? 'Loading…'
                : `${summary?.ended ?? 0} ended cleanly, ${summary?.active ?? 0} still open, ${summary?.errored ?? 0} errored.`}
            </p>
          </article>
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Average call length</p>
            <p className="vfy-biz-card-value">
              {loading
                ? '…'
                : summary?.avgDurationSec == null
                  ? '—'
                  : formatDuration(summary.avgDurationSec)}
            </p>
            <p className="vfy-biz-card-note">
              {loading
                ? 'Loading…'
                : summary?.durationSamples
                  ? `Across ${summary.durationSamples} completed conversation${summary.durationSamples === 1 ? '' : 's'}.`
                  : 'Recorded once conversations finish.'}
            </p>
          </article>
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Caller turns captured</p>
            <p className="vfy-biz-card-value">
              {loading ? '…' : (summary?.userTurns ?? 0)}
            </p>
            <p className="vfy-biz-card-note">
              {loading
                ? 'Loading…'
                : `${summary?.messages ?? 0} total transcript messages stored.`}
            </p>
          </article>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="vfy-biz-card">
          <p className="vfy-biz-card-label">Conversations</p>
          <p className="vfy-biz-card-value" style={{ fontSize: 22 }}>
            {loading ? '…' : data?.summary.conversations ?? 0}
          </p>
        </div>
        <div className="vfy-biz-card">
          <p className="vfy-biz-card-label">Avg first response</p>
          <p className="vfy-biz-card-value" style={{ fontSize: 22 }}>
            {loading
              ? '…'
              : summary?.avgLatency == null
                ? '—'
                : `${summary.avgLatency} ms`}
          </p>
          <p className="vfy-biz-card-note">
            {loading
              ? ''
              : summary?.latencySamples
                ? `Best ${summary.bestLatencyMs} ms over ${summary.latencySamples} turn${summary.latencySamples === 1 ? '' : 's'}.`
                : 'Time to first audio, measured per turn.'}
          </p>
        </div>
        <div className="vfy-biz-card">
          <p className="vfy-biz-card-label">Credit balance</p>
          <p className="vfy-biz-card-value" style={{ fontSize: 22 }}>
            {loading
              ? '…'
              : `$${((data?.creditBalanceCents ?? 0) / 100).toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-voice-text mb-4">
            Volume · last {data?.windowDays ?? 14} days
          </h3>
          <div className="h-[280px]">
            {byDay.length === 0 ? (
              <p className="text-sm text-voice-muted">No recent sessions to chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-voice-chart-grid)" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} stroke="var(--color-voice-chart-axis)" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="var(--color-voice-chart-axis)" />
                  <Tooltip />
                  <Bar dataKey="conversations" fill="var(--color-voice-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-voice-surface border border-voice-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-voice-text mb-4">By channel</h3>
          <div className="h-[280px]">
            {byChannel.length === 0 ? (
              <p className="text-sm text-voice-muted">Channel breakdown appears after the first call.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-voice-chart-grid)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-voice-series-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-voice-surface border border-voice-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-voice-border">
          <h3 className="text-lg font-bold text-voice-text">Recent conversations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-voice-muted border-b border-voice-border">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Latency</th>
                <th className="px-5 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent ?? []).map((row) => (
                <tr key={row.id} className="border-b border-voice-border/60">
                  <td className="px-5 py-3 font-mono text-xs text-voice-text">{row.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-voice-text">{row.channel}</td>
                  <td className="px-5 py-3 text-voice-text">{row.status}</td>
                  <td className="px-5 py-3 text-voice-text">
                    {row.latencyMs != null ? `${row.latencyMs} ms` : "—"}
                  </td>
                  <td className="px-5 py-3 text-voice-muted">
                    {new Date(row.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && (data?.recent.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-voice-muted">
                    No conversations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
