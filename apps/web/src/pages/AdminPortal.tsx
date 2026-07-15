/**
 * Super-admin portal — approve/reject/suspend users, manage org credits & usage.
 * Fully responsive: stacked nav on mobile, table → cards under 768px.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { apiJson, getSession, signOut } from "../lib/auth/client";
import { clearAuthToken } from "../components/RequireAuth";
import "../admin.css";

type Tab = "overview" | "users" | "orgs" | "usage";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  platformRole: "user" | "super_admin";
  createdAt: string;
  orgs: Array<{
    orgId: string;
    orgName: string;
    role: string;
    credits: number;
    orgStatus: string;
  }>;
};

type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  creditBalanceCents: number;
  status: "active" | "suspended";
  agentCount: number;
  createdAt: string;
};

type Overview = {
  users: {
    users: number;
    pending: number;
    approved: number;
    suspended: number;
  };
  organizations: {
    orgs: number;
    credits: number;
    suspendedOrgs: number;
  };
  usage: {
    events: number;
    sttMs: number;
    llmTokens: number;
    ttsChars: number;
  };
  conversations: number;
};

function cents(n: number) {
  return `$${(n / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`adm-badge adm-badge--${status}`}>{status}</span>;
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [usage, setUsage] = useState<{
    events: unknown[];
    daily: unknown[];
    ledger: Array<{
      id: string;
      orgId: string;
      deltaCents: number;
      reason: string;
      balanceAfter: number;
      createdAt: string;
    }>;
  } | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [userQuery, setUserQuery] = useState("");
  const [orgQuery, setOrgQuery] = useState("");
  const [creditDraft, setCreditDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSession();
      if (!session?.user) {
        navigate("/auth?mode=signin&redirect=/admin");
        return;
      }
      setAdminEmail(session.user.email);

      const me = await apiJson<{ user: { platformRole?: string } }>(
        "/api/admin/me",
      ).catch(() => null);
      if (!me || me.user.platformRole !== "super_admin") {
        setError("Super admin access required.");
        setLoading(false);
        return;
      }

      const [ov, us, og, ug] = await Promise.all([
        apiJson<Overview>("/api/admin/overview"),
        apiJson<{ users: AdminUser[] }>("/api/admin/users"),
        apiJson<{ organizations: AdminOrg[] }>("/api/admin/organizations"),
        apiJson<{
          events: unknown[];
          daily: unknown[];
          ledger: Array<{
            id: string;
            orgId: string;
            deltaCents: number;
            reason: string;
            balanceAfter: number;
            createdAt: string;
          }>;
        }>("/api/admin/usage"),
      ]);
      setOverview(ov);
      setUsers(us.users);
      setOrgs(og.organizations);
      setUsage(ug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userFilter !== "all" && u.status !== userFilter) return false;
      if (!userQuery.trim()) return true;
      const q = userQuery.toLowerCase();
      return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    });
  }, [users, userFilter, userQuery]);

  const filteredOrgs = useMemo(() => {
    if (!orgQuery.trim()) return orgs;
    const q = orgQuery.toLowerCase();
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [orgs, orgQuery]);

  async function setStatus(userId: string, status: AdminUser["status"]) {
    setBusyId(userId);
    try {
      await apiJson(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function setOrgStatus(orgId: string, status: "active" | "suspended") {
    setBusyId(orgId);
    try {
      await apiJson(`/api/admin/organizations/${orgId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Org update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function adjustCredits(orgId: string) {
    const raw = creditDraft[orgId];
    const dollars = Number(raw);
    if (!Number.isFinite(dollars) || dollars === 0) {
      setError("Enter a non-zero credit amount in dollars (e.g. 25 or -5)");
      return;
    }
    setBusyId(orgId);
    try {
      await apiJson(`/api/admin/organizations/${orgId}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amountCents: Math.round(dollars * 100),
          reason: "admin_portal_adjustment",
        }),
      });
      setCreditDraft((d) => ({ ...d, [orgId]: "" }));
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit adjustment failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    clearAuthToken();
    navigate("/auth?mode=signin");
  }

  const navItems: Array<{ id: Tab; label: string; icon: typeof Users }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "orgs", label: "Organizations", icon: Building2 },
    { id: "usage", label: "Usage & Credits", icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="adm-shell adm-shell--center">
        <p className="adm-muted">Loading admin portal…</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="adm-shell adm-shell--center">
        <div className="adm-card adm-card--narrow">
          <Shield size={28} />
          <h1>Admin access</h1>
          <p className="adm-muted">{error}</p>
          <div className="adm-actions">
            <Link to="/auth?mode=signin" className="adm-btn adm-btn--ghost">
              Sign in
            </Link>
            <button type="button" className="adm-btn" onClick={() => void loadAll()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-shell">
      <header className="adm-top">
        <button
          type="button"
          className="adm-icon-btn adm-nav-toggle"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          onClick={() => setNavOpen((v) => !v)}
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="adm-brand">
          <Shield size={18} aria-hidden />
          <span>Super Admin · Voiceify</span>
        </div>
        <div className="adm-top-right">
          <span className="adm-top-email" title="Signed-in platform operator">
            {adminEmail}
          </span>
          <button type="button" className="adm-icon-btn" onClick={() => void handleSignOut()} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="adm-body">
        <aside className={`adm-nav ${navOpen ? "is-open" : ""}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`adm-nav-item ${tab === item.id ? "is-active" : ""}`}
                onClick={() => {
                  setTab(item.id);
                  setNavOpen(false);
                }}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </button>
            );
          })}
          <p className="adm-muted" style={{ padding: "12px 16px", fontSize: 12 }}>
            Credits, approvals, and usage are managed here. Tenant workspaces are separate accounts.
          </p>
        </aside>

        {navOpen && (
          <button
            type="button"
            className="adm-backdrop"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        )}

        <main id="main-content" className="adm-main">
          {error && (
            <div className="adm-alert" role="alert">
              {error}
              <button type="button" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {tab === "overview" && overview && (
            <section className="adm-section">
              <h1>Platform overview</h1>
              <p className="adm-muted">Approve signups, fund credits, and monitor usage.</p>
              <div className="adm-stats">
                <article className="adm-stat">
                  <span>Users</span>
                  <strong>{overview.users.users}</strong>
                  <small>{overview.users.pending} pending</small>
                </article>
                <article className="adm-stat">
                  <span>Approved</span>
                  <strong>{overview.users.approved}</strong>
                  <small>{overview.users.suspended} suspended</small>
                </article>
                <article className="adm-stat">
                  <span>Organizations</span>
                  <strong>{overview.organizations.orgs}</strong>
                  <small>{overview.organizations.suspendedOrgs} suspended</small>
                </article>
                <article className="adm-stat">
                  <span>Total credits</span>
                  <strong>{cents(overview.organizations.credits)}</strong>
                  <small>{overview.conversations} conversations</small>
                </article>
                <article className="adm-stat">
                  <span>STT seconds</span>
                  <strong>{Math.round(overview.usage.sttMs / 1000)}</strong>
                  <small>{overview.usage.events} events</small>
                </article>
                <article className="adm-stat">
                  <span>LLM tokens</span>
                  <strong>{overview.usage.llmTokens.toLocaleString()}</strong>
                  <small>{overview.usage.ttsChars.toLocaleString()} TTS chars</small>
                </article>
              </div>
            </section>
          )}

          {tab === "users" && (
            <section className="adm-section">
              <div className="adm-section-head">
                <div>
                  <h1>Users</h1>
                  <p className="adm-muted">Approve, reject, or suspend platform accounts.</p>
                </div>
                <div className="adm-toolbar">
                  <label className="adm-search">
                    <Search size={16} aria-hidden />
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Search name or email"
                    />
                  </label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Orgs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td data-label="User">
                          <div className="adm-cell-stack">
                            <strong>{u.name}</strong>
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={u.status} />
                        </td>
                        <td data-label="Role">{u.platformRole}</td>
                        <td data-label="Orgs">
                          {u.orgs.length
                            ? u.orgs.map((o) => o.orgName).join(", ")
                            : "—"}
                        </td>
                        <td data-label="Actions">
                          <div className="adm-row-actions">
                            {u.status !== "approved" && (
                              <button
                                type="button"
                                className="adm-btn adm-btn--sm"
                                disabled={busyId === u.id}
                                onClick={() => void setStatus(u.id, "approved")}
                              >
                                Approve
                              </button>
                            )}
                            {u.status === "pending" && (
                              <button
                                type="button"
                                className="adm-btn adm-btn--sm adm-btn--danger"
                                disabled={busyId === u.id}
                                onClick={() => void setStatus(u.id, "rejected")}
                              >
                                Reject
                              </button>
                            )}
                            {u.status === "approved" && u.platformRole !== "super_admin" && (
                              <button
                                type="button"
                                className="adm-btn adm-btn--sm adm-btn--warn"
                                disabled={busyId === u.id}
                                onClick={() => void setStatus(u.id, "suspended")}
                              >
                                Suspend
                              </button>
                            )}
                            {u.status === "suspended" && (
                              <button
                                type="button"
                                className="adm-btn adm-btn--sm"
                                disabled={busyId === u.id}
                                onClick={() => void setStatus(u.id, "approved")}
                              >
                                Reinstate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredUsers.length && <p className="adm-empty">No users match this filter.</p>}
              </div>
            </section>
          )}

          {tab === "orgs" && (
            <section className="adm-section">
              <div className="adm-section-head">
                <div>
                  <h1>Organizations</h1>
                  <p className="adm-muted">Assign credits and suspend tenant workspaces.</p>
                </div>
                <label className="adm-search">
                  <Search size={16} aria-hidden />
                  <input
                    value={orgQuery}
                    onChange={(e) => setOrgQuery(e.target.value)}
                    placeholder="Search organizations"
                  />
                </label>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Status</th>
                      <th>Credits</th>
                      <th>Agents</th>
                      <th>Credit adjust ($)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((o) => (
                      <tr key={o.id}>
                        <td data-label="Organization">
                          <div className="adm-cell-stack">
                            <strong>{o.name}</strong>
                            <span>{o.slug}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={o.status} />
                        </td>
                        <td data-label="Credits">{cents(o.creditBalanceCents)}</td>
                        <td data-label="Agents">{o.agentCount}</td>
                        <td data-label="Credit adjust ($)">
                          <div className="adm-credit-row">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="25"
                              value={creditDraft[o.id] ?? ""}
                              onChange={(e) =>
                                setCreditDraft((d) => ({ ...d, [o.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="adm-btn adm-btn--sm"
                              disabled={busyId === o.id}
                              onClick={() => void adjustCredits(o.id)}
                            >
                              Apply
                            </button>
                          </div>
                        </td>
                        <td data-label="Actions">
                          {o.status === "active" ? (
                            <button
                              type="button"
                              className="adm-btn adm-btn--sm adm-btn--warn"
                              disabled={busyId === o.id}
                              onClick={() => void setOrgStatus(o.id, "suspended")}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adm-btn adm-btn--sm"
                              disabled={busyId === o.id}
                              onClick={() => void setOrgStatus(o.id, "active")}
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredOrgs.length && <p className="adm-empty">No organizations found.</p>}
              </div>
            </section>
          )}

          {tab === "usage" && usage && (
            <section className="adm-section">
              <h1>Usage & credit ledger</h1>
              <p className="adm-muted">Recent platform-wide credit movements and metered events.</p>

              <h2 className="adm-subhead">Credit ledger</h2>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Org</th>
                      <th>Delta</th>
                      <th>Balance</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.ledger.map((row) => (
                      <tr key={row.id}>
                        <td data-label="When">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td data-label="Org">
                          <code>{row.orgId.slice(0, 8)}…</code>
                        </td>
                        <td data-label="Delta">{cents(row.deltaCents)}</td>
                        <td data-label="Balance">{cents(row.balanceAfter)}</td>
                        <td data-label="Reason">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!usage.ledger.length && <p className="adm-empty">No ledger entries yet.</p>}
              </div>

              <h2 className="adm-subhead">Recent usage events</h2>
              <p className="adm-muted">{usage.events.length} latest events loaded.</p>
              <pre className="adm-pre">{JSON.stringify(usage.events.slice(0, 20), null, 2)}</pre>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
