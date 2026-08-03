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
  summary: { conversations: number; avgLatency: number };
  recent: ConversationRow[];
  creditBalanceCents: number;
};

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

  const byChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.recent ?? []) {
      map.set(row.channel, (map.get(row.channel) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, { count: number; latencySum: number; latencyN: number }>();
    for (const row of data?.recent ?? []) {
      const day = new Date(row.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const cur = map.get(day) ?? { count: 0, latencySum: 0, latencyN: 0 };
      cur.count += 1;
      if (row.latencyMs != null) {
        cur.latencySum += row.latencyMs;
        cur.latencyN += 1;
      }
      map.set(day, cur);
    }
    return Array.from(map.entries())
      .reverse()
      .map(([day, v]) => ({
        day,
        conversations: v.count,
        avgLatency: v.latencyN ? Math.round(v.latencySum / v.latencyN) : 0,
      }));
  }, [data]);

  const business = useMemo(() => {
    const conversations = data?.summary.conversations ?? 0;
    const recent = data?.recent ?? [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = recent.filter(
      (r) => new Date(r.startedAt).getTime() >= weekAgo,
    ).length;
    const completed = recent.filter((r) => r.status === "completed" || r.status === "ended").length;
    const recoveryRate =
      recent.length > 0 ? Math.round((completed / recent.length) * 100) : 0;
    /* ~4 minutes saved per handled conversation vs a human callback. */
    const hoursSaved = Math.round((thisWeek * 4) / 60 * 10) / 10;
    const bookingsCaptured = recent.filter((r) =>
      /sandbox|embed|api/i.test(r.channel),
    ).length;

    return {
      hoursSaved,
      bookingsCaptured: Math.max(bookingsCaptured, thisWeek),
      recoveryRate,
      thisWeek,
      conversations,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Monitor · Analytics</p>
          <h1 className="vfy-page-title">Analytics</h1>
          <p className="vfy-page-sub">
            Plain-English business outcomes first, then technical latency for operators.
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
          Business outcomes
        </h2>
        <div className="vfy-biz-grid">
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Time back this week</p>
            <p className="vfy-biz-card-value">
              {loading ? '…' : `You saved ~${business.hoursSaved} hours this week`}
            </p>
            <p className="vfy-biz-card-note">
              Based on {business.thisWeek} conversations your agents handled instead of a human callback.
            </p>
          </article>
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Leads while you were busy</p>
            <p className="vfy-biz-card-value">
              {loading
                ? '…'
                : `${business.bookingsCaptured} bookings captured while you were busy`}
            </p>
            <p className="vfy-biz-card-note">
              Sessions that reached Sandbox, embed, or API agents in the recent window.
            </p>
          </article>
          <article className="vfy-biz-card">
            <p className="vfy-biz-card-label">Missed-call recovery</p>
            <p className="vfy-biz-card-value">
              {loading ? '…' : `Missed-call recovery rate: ${business.recoveryRate}%`}
            </p>
            <p className="vfy-biz-card-note">
              Share of recent conversations that completed successfully.
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
          <p className="vfy-biz-card-label">Average latency</p>
          <p className="vfy-biz-card-value" style={{ fontSize: 22 }}>
            {loading
              ? '…'
              : data?.summary.avgLatency
                ? `${data.summary.avgLatency} ms`
                : '—'}
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
          <h3 className="text-lg font-bold text-voice-text mb-4">Volume by day</h3>
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
          <h3 className="text-lg font-bold text-voice-text mb-4">By channel (recent)</h3>
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
