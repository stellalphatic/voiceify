import { useCallback, useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  GitBranch,
  KeyRound,
  MessageSquare,
  Mic2,
  Settings,
  Shield,
  ShieldAlert,
  TerminalSquare,
  Users,
  Webhook,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuthAccountOptional } from '../../lib/auth/AuthAccountContext';
import { setConsoleMode } from '../../lib/auth/console-mode';
import { apiJson, getActiveOrgId } from '../../lib/auth/client';
import { isDashboardNavActive, DASHBOARD_NAV_PATHS } from '../../lib/dashboard/nav';
import VoiceifyMark from '../VoiceifyMark';

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
      { id: 'dashboard', icon: BarChart3, label: 'Overview', path: DASHBOARD_NAV_PATHS.overview },
      { id: 'agents', icon: Users, label: 'Agents', path: DASHBOARD_NAV_PATHS.agents },
      { id: 'sandbox', icon: TerminalSquare, label: 'Sandbox', path: DASHBOARD_NAV_PATHS.sandbox },
    ],
  },
  {
    title: 'Configure',
    items: [
      { id: 'knowledge', icon: BookOpen, label: 'Knowledge base', path: DASHBOARD_NAV_PATHS.knowledge },
      { id: 'tools', icon: Wrench, label: 'Tools', path: DASHBOARD_NAV_PATHS.tools },
      { id: 'voices', icon: Mic2, label: 'Voices', path: DASHBOARD_NAV_PATHS.voices },
      { id: 'workflows', icon: GitBranch, label: 'Workflows', path: DASHBOARD_NAV_PATHS.workflows },
      { id: 'guardrails', icon: ShieldAlert, label: 'Guardrails', path: DASHBOARD_NAV_PATHS.guardrails },
      { id: 'integrations', icon: Webhook, label: 'Integrations', path: DASHBOARD_NAV_PATHS.integrations },
    ],
  },
  {
    title: 'Monitor',
    items: [
      {
        id: 'conversations',
        icon: MessageSquare,
        label: 'Conversations',
        path: DASHBOARD_NAV_PATHS.conversations,
      },
      { id: 'analytics', icon: Activity, label: 'Analytics', path: DASHBOARD_NAV_PATHS.analytics },
    ],
  },
  {
    title: 'Deploy',
    items: [
      { id: 'api-keys', icon: KeyRound, label: 'API keys', path: DASHBOARD_NAV_PATHS.apiKeys },
      { id: 'settings', icon: Settings, label: 'Settings', path: DASHBOARD_NAV_PATHS.settings },
    ],
  },
];

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

  const releaseNavFocus = useCallback(() => {
    onClose();
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.vfy-side')) {
      active.blur();
    }
  }, [onClose]);

  useEffect(() => {
    releaseNavFocus();
  }, [pathname, releaseNavFocus]);

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
        onClick={releaseNavFocus}
        aria-hidden="true"
      />
      <aside
        className={`vfy-side${isOpen ? ' is-open' : ''}`}
        aria-label="Dashboard navigation"
      >
        <Link to="/dashboard" className="vfy-side-brand" onClick={releaseNavFocus}>
          <span className="vfy-side-brand-orb">
            <VoiceifyMark size={18} />
          </span>
          <span className="vfy-side-brand-text vfy-side-collapse-hide">Voiceify</span>
        </Link>

        <div className="vfy-side-account vfy-side-collapse-hide">
          <p className="vfy-side-account-email">{displayEmail || displayName}</p>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="vfy-side-section-title">{group.title}</p>
            <nav className="vfy-side-nav">
              {group.items.map((item) => {
                const active = isDashboardNavActive(pathname, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`vfy-side-link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    data-tooltip={item.label}
                    onClick={releaseNavFocus}
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
                onClick={() => {
                  setConsoleMode('admin');
                  releaseNavFocus();
                }}
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
          <Link
            to={DASHBOARD_NAV_PATHS.settings}
            className="vfy-side-credits-cta"
            onClick={releaseNavFocus}
          >
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
