import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bot,
  Search,
  Settings,
  Sparkles,
  TerminalSquare,
  Users,
  Webhook,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: string;
};

/**
 * Two-section nav. Section labels are rendered as small mono captions to give
 * the sidebar an IDE-like, tools-first feel.
 */
const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard',   icon: BarChart3,      label: 'Overview',  path: '/dashboard' },
      { id: 'agents',      icon: Users,          label: 'Agents',    path: '/dashboard/agents' },
      { id: 'sandbox',     icon: TerminalSquare, label: 'Sandbox',   path: '/dashboard/sandbox' },
      { id: 'analytics',   icon: Activity,       label: 'Analytics', path: '/dashboard/analytics', badge: 'Beta' },
    ],
  },
  {
    title: 'Build',
    items: [
      { id: 'integrations', icon: Webhook,  label: 'Integrations', path: '/dashboard/integrations' },
      { id: 'settings',     icon: Settings, label: 'Settings',     path: '/dashboard/settings' },
    ],
  },
];

function isActive(pathname: string, itemPath: string) {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  /* Close mobile drawer on route change */
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ⌘K / Ctrl+K wires to a noop search-bar toast for now (purely visual) */
  const onCmdK = () => {
    /* placeholder for future command-palette */
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onCmdK();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div
        className={`vfy-side-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`vfy-side${isOpen ? ' is-open' : ''}`} aria-label="Dashboard navigation">
        {/* Brand */}
        <Link to="/dashboard" className="vfy-side-brand">
          <span className="vfy-side-brand-orb">
            <Bot size={16} strokeWidth={2.4} />
          </span>
          <span className="vfy-side-brand-text vfy-side-collapse-hide">Voiceify</span>
          <span className="vfy-side-brand-version vfy-side-collapse-hide">v3.2</span>
        </Link>

        {/* Cmd-K bar */}
        <button type="button" className="vfy-side-cmd" onClick={onCmdK} aria-label="Search">
          <Search size={16} strokeWidth={2.25} />
          <span className="vfy-side-cmd-text vfy-side-collapse-hide">Search…</span>
          <span className="vfy-side-cmd-kbd vfy-side-collapse-hide">⌘K</span>
        </button>

        {/* Nav groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <p className="vfy-side-section-title">{group.title}</p>
            <nav className="vfy-side-nav">
              {group.items.map(item => {
                const active = isActive(pathname, item.path);
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
                    {item.badge && (
                      <span className="vfy-side-link-badge vfy-side-collapse-hide">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="vfy-side-spacer" aria-hidden="true" />

        {/* Pro upgrade card — only renders when sidebar is expanded */}
        <div className="vfy-side-pro">
          <p className="vfy-side-pro-eyebrow">Upgrade</p>
          <p className="vfy-side-pro-title">Voiceify Scale</p>
          <p className="vfy-side-pro-sub">
            Unlock concurrent calls, real-time analytics, and SSO.
          </p>
          <Link to="/pricing" className="vfy-side-pro-cta">
            <Sparkles size={14} strokeWidth={2.25} />
            See plans
          </Link>
        </div>

        {/* User chip */}
        <div className="vfy-side-user" role="button" tabIndex={0}>
          <span className="vfy-side-user-avatar">J</span>
          <div className="vfy-side-user-meta vfy-side-collapse-hide">
            <p className="vfy-side-user-name">Jane Carter</p>
            <p className="vfy-side-user-mail">jane@voiceify.ai</p>
          </div>
          <Zap size={15} strokeWidth={2.25} className="vfy-side-collapse-hide ui-icon" />
        </div>
      </aside>
    </>
  );
}
