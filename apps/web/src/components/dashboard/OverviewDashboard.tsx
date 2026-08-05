import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Headphones,
  Hourglass,
  MessageSquare,
  Plus,
  Timer,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "./StatCard";
import { apiJson, getActiveOrgId } from "../../lib/auth/client";
import { useAgentStore } from "../../lib/agents/AgentStoreContext";
import { useAuthAccountOptional } from "../../lib/auth/AuthAccountContext";

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

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function durationLabel(row: ConversationRow): string {
  if (!row.endedAt) return "—";
  const ms = new Date(row.endedAt).getTime() - new Date(row.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusTone(status: string): "success" | "warn" | "neutral" {
  if (status === "completed" || status === "ended") return "success";
  if (status === "failed" || status === "error") return "warn";
  return "neutral";
}

function titleCase(value: string): string {
  if (!value) return "Unknown";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function channelLabel(channel: string): string {
  const key = channel.trim().toLowerCase();
  if (key === "sandbox") return "Sandbox test";
  if (key === "widget") return "Widget call";
  if (key === "api") return "API session";
  if (key === "phone" || key === "voice") return "Voice call";
  return titleCase(channel || "Session");
}

function statusLabel(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "completed" || key === "ended") return "Completed";
  if (key === "active" || key === "in_progress" || key === "running") return "In progress";
  if (key === "failed" || key === "error") return "Failed";
  return titleCase(status || "Unknown");
}

function startedClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OverviewDashboard({
  onCreateAgent,
}: {
  onCreateAgent: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const account = useAuthAccountOptional();
  const { agents } = useAgentStore();
  const orgId = getActiveOrgId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setError("No workspace selected. Create or select an organization.");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiJson<AnalyticsPayload>(
          `/api/orgs/${orgId}/analytics`,
        );
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    if (!containerRef.current || loading) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>(":scope > *");
    if (!els.length) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    gsap.fromTo(
      els,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power3.out",
        stagger: 0.05,
        clearProps: "opacity,transform",
      },
    );
  }, [loading, analytics]);

  const chartData = useMemo(() => {
    const recent = analytics?.recent ?? [];
    const byDay = new Map<string, number>();
    for (const row of recent) {
      const day = new Date(row.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return Array.from(byDay.entries())
      .reverse()
      .map(([day, count]) => ({ day, count }));
  }, [analytics]);

  const credits = analytics?.creditBalanceCents ?? 0;
  const conversations = analytics?.summary.conversations ?? 0;
  const avgLatency = analytics?.summary.avgLatency ?? 0;
  const greeting = account?.user.name?.split(" ")[0] || "there";

  const tooltipStyle = {
    background: "var(--d-card)",
    border: "1px solid var(--d-border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div ref={containerRef} className="vfy-overview">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">Overview · Live workspace</p>
          <h1 className="vfy-page-title">Welcome, {greeting}</h1>
          <p className="vfy-page-sub">
            Live metrics for this workspace. Credits update as voice traffic runs.
          </p>
        </div>
        <div className="vfy-page-actions">
          <button type="button" className="vfy-btn vfy-btn-primary" onClick={onCreateAgent}>
            <Plus size={14} />
            New agent
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm mb-4" role="alert" style={{ color: "var(--d-danger, #e11)" }}>
          {error}
        </p>
      )}

      <div className="vfy-stats-grid">
        <StatCard
          variant="trend"
          label="Credit balance"
          value={loading ? "…" : `$${(credits / 100).toFixed(2)}`}
          icon={Hourglass}
          sub="Managed in Settings · admin can grant more"
        />
        <StatCard
          variant="trend"
          label="Agents"
          value={String(agents.length)}
          icon={Headphones}
          sub="Saved in this workspace"
        />
        <StatCard
          variant="trend"
          label="Conversations"
          value={loading ? "…" : String(conversations)}
          icon={MessageSquare}
          sub="All time in this workspace"
        />
        <StatCard
          variant="cta"
          label="Avg latency"
          value={loading ? "…" : avgLatency ? `${avgLatency} ms` : "—"}
          icon={Timer}
          cta="Open analytics"
          onCtaClick={() => navigate("/dashboard/analytics")}
          sub="Measured across recorded turns"
        />
      </div>

      <div className="vfy-grid-charts-3" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Recent conversations</h3>
            <span className="vfy-chart-card-trend">
              <BarChart3 size={11} />
              Last {analytics?.recent.length ?? 0} sessions
            </span>
          </div>
          <div className="vfy-chart-card-body" style={{ height: 240 }}>
            {chartData.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--d-muted)",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 24,
                }}
              >
                No conversations yet. Launch an agent in Sandbox or embed the widget to see traffic here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--d-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--d-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,217,146,0.05)" }} />
                  <Bar dataKey="count" fill="var(--d-accent)" radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="vfy-chart-card">
          <div className="vfy-chart-card-head">
            <h3 className="vfy-chart-card-title">Workspace snapshot</h3>
          </div>
          <div className="vfy-chart-card-body" style={{ padding: 20 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
              <li style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
                <span style={{ color: "var(--d-muted)" }}>Signed in as</span>
                <span style={{ color: "var(--d-text)", textAlign: "right", wordBreak: "break-all" }}>
                  {account?.user.email ?? "—"}
                </span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
                <span style={{ color: "var(--d-muted)" }}>Org id</span>
                <span
                  style={{
                    color: "var(--d-text-2)",
                    fontFamily: "var(--d-mono)",
                    fontSize: 12.5,
                  }}
                  title={orgId ?? undefined}
                >
                  {orgId ? `${orgId.slice(0, 10)}…` : "—"}
                </span>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
                <span style={{ color: "var(--d-muted)" }}>Credits</span>
                <span style={{ color: "var(--d-text)" }}>${(credits / 100).toFixed(2)}</span>
              </li>
              <li>
                <Link to="/dashboard/settings" className="vfy-panel-link">
                  Manage credits <ChevronRight size={11} />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="vfy-panel">
        <div className="vfy-panel-head">
          <h3 className="vfy-panel-title">
            <Activity size={14} />
            Recent activity
          </h3>
          <Link to="/dashboard/analytics" className="vfy-panel-link">
            View analytics <ChevronRight size={11} />
          </Link>
        </div>
        <div className="vfy-panel-body">
          {loading && (
            <p className="text-sm" style={{ color: "var(--d-muted)", padding: 16 }}>
              Loading conversations…
            </p>
          )}
          {!loading && (analytics?.recent.length ?? 0) === 0 && (
            <p className="text-sm" style={{ color: "var(--d-muted)", padding: 16 }}>
              No sessions recorded yet. Test an agent from Sandbox to populate this feed.
            </p>
          )}
          {(analytics?.recent ?? []).slice(0, 8).map((row) => {
            const tone = statusTone(row.status);
            const label = statusLabel(row.status);
            const clock = startedClock(row.startedAt);
            return (
              <div key={row.id} className="vfy-row">
                <span className="vfy-row-avatar">
                  <CalendarDays size={14} />
                </span>
                <div className="vfy-row-meta">
                  <p className="vfy-row-name">{channelLabel(row.channel)}</p>
                  <p className="vfy-row-sub">
                    {formatRelative(row.startedAt)}
                    {clock ? ` · ${clock}` : ""}
                    {row.latencyMs != null ? ` · ${row.latencyMs} ms` : ""}
                    {" · "}
                    <span className="vfy-row-sub-id" title={row.id}>
                      {row.id.slice(0, 8)}…
                    </span>
                  </p>
                </div>
                <span className="vfy-row-duration" title="Session duration">
                  {durationLabel(row)}
                </span>
                <span
                  className={`vfy-pill ${
                    tone === "success"
                      ? "vfy-pill-success"
                      : tone === "warn"
                        ? "vfy-pill-warn"
                        : "vfy-pill-neutral"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="vfy-panel-foot">
          Showing{" "}
          <span style={{ color: "var(--d-text)" }}>
            {Math.min(8, analytics?.recent.length ?? 0)}
          </span>{" "}
          of{" "}
          <span style={{ color: "var(--d-text)" }}>{conversations}</span> conversations
        </div>
      </div>
    </div>
  );
}
