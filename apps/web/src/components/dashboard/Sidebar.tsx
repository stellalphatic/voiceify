import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bot,
  KeyRound,
  Search,
  Settings,
  Shield,
  TerminalSquare,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useAuthAccountOptional } from '../../lib/auth/AuthAccountContext';
import { setConsoleMode } from '../../lib/auth/console-mode';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';

type NavItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Build',
    items: [
      { id: 'dashboard', icon: BarChart3, label: 'Overview', path: '/dashboard' },
      { id: 'agents', icon: Users, label: 'Agents', path: '/dashboard/agents' },
      { id: 'sandbox', icon: TerminalSquare, label: 'Sandbox', path: '/dashboard/sandbox' },
    ],
  },
  {
    title: 'Observe',
    items: [
      { id: 'analytics', icon: Activity, label: 'Analytics', path: '/dashboard/analytics' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { id: 'integrations', icon: Webhook, label: 'Integrations', path: '/dashboard/integrations' },
      { id: 'settings', icon: Settings, label: 'Settings', path: '/dashboard/settings' },
      { id: 'api-keys', icon: KeyRound, label: 'API keys', path: '/dashboard/settings' },
    ],
  },
];

function isActive(pathname: string, itemPath: string) {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function initialsOf(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const account = useAuthAccountOptional();
  const displayName = account?.user.name?.trim() || 'Account';
  const displayEmail = account?.user.email || '';
  const isAdmin = account?.user.platformRole === 'super_admin';
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const orgId = getActiveOrgId();
    if (!orgId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{ creditBalanceCents: number }>(
          `/api/orgs/${orgId}/billing`,
        );
        if (!cancelled) setCredits(data.creditBalanceCents);
      } catch {
        if (!cancelled) setCredits(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <div
        className={`vfy-side-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`vfy-side${isOpen ? ' is-open' : ''}`} aria-label="Dashboard navigation">
        <Link to="/dashboard" className="vfy-side-brand">
          <span className="vfy-side-brand-orb">
            <Bot size={16} strokeWidth={2.4} />
          </span>
          <span className="vfy-side-brand-text vfy-side-collapse-hide">voiceify</span>
        </Link>

        <div className="vfy-side-account vfy-side-collapse-hide">
          <p className="vfy-side-account-email">{displayEmail || displayName}</p>
        </div>

        <button type="button" className="vfy-side-cmd" aria-label="Search">
          <Search size={16} strokeWidth={2.25} />
          <span className="vfy-side-cmd-text vfy-side-collapse-hide">Search…</span>
          <span className="vfy-side-cmd-kbd vfy-side-collapse-hide">⌘K</span>
        </button>

        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="vfy-side-section-title">{group.title}</p>
            <nav className="vfy-side-nav">
              {group.items.map((item) => {
                const active =
                  item.id === 'api-keys'
                    ? pathname.startsWith('/dashboard/settings')
                    : isActive(pathname, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`vfy-side-link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    data-tooltip={item.label}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                    <span className="vfy-side-collapse-hide">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="vfy-side-section-title">Platform</p>
            <nav className="vfy-side-nav">
              <Link
                to="/admin"
                className="vfy-side-link"
                data-tooltip="Admin"
                onClick={() => setConsoleMode('admin')}
              >
                <Shield size={18} strokeWidth={2.25} />
                <span className="vfy-side-collapse-hide">Super admin</span>
              </Link>
            </nav>
          </div>
        )}

        <div className="vfy-side-spacer" aria-hidden="true" />

        <div className="vfy-side-credits vfy-side-collapse-hide">
          <p className="vfy-side-credits-label">Credits</p>
          <p className="vfy-side-credits-value">
            {credits == null ? '—' : `$${(credits / 100).toFixed(2)}`}
          </p>
          <Link to="/dashboard/settings" className="vfy-side-credits-cta">
            Manage
          </Link>
        </div>

        <div className="vfy-side-user">
          <span className="vfy-side-user-avatar">{initialsOf(displayName)}</span>
          <div className="vfy-side-user-meta vfy-side-collapse-hide">
            <p className="vfy-side-user-name">{displayName}</p>
            <p className="vfy-side-user-mail">{displayEmail}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
