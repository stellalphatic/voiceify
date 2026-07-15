import { Bell, ChevronRight, Menu, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import UserMenu from './UserMenu';
import type { ReactNode } from 'react';

interface Crumb {
  label: string;
  to?: string;
}

interface DashboardTopbarProps {
  crumbs: Crumb[];
  /** Slot for view-specific actions (e.g. "Create Agent" CTA). */
  actions?: ReactNode;
  onMenuClick: () => void;
}

/**
 * Sticky topbar above every dashboard page. Contains:
 *  - Mobile hamburger
 *  - Breadcrumbs (clickable up to current page)
 *  - LIVE status pill
 *  - Notifications + settings icon buttons
 *  - User avatar (existing UserMenu)
 *  - Optional action slot rendered to the right of the user
 */
export default function DashboardTopbar({ crumbs, actions, onMenuClick }: DashboardTopbarProps) {
  return (
    <header className="vfy-top">
      <button
        type="button"
        className="vfy-top-burger"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={18} strokeWidth={2.25} />
      </button>

      <nav className="vfy-top-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <ChevronRight size={13} className="vfy-top-crumb-sep" />}
              {c.to && !isLast ? (
                <Link to={c.to} className="vfy-top-crumb" style={{ color: 'var(--d-muted)', textDecoration: 'none' }}>
                  {c.label}
                </Link>
              ) : (
                <span className="vfy-top-crumb">{c.label}</span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="vfy-top-spacer" />

      <span className="vfy-top-status" aria-label="System status: live">
        <span className="vfy-top-status-dot" />
        <span>Live</span>
      </span>

      <span className="vfy-top-theme">
        <ThemeToggle size="sm" />
      </span>

      <Link to="/dashboard/settings" className="vfy-top-iconbtn" aria-label="Settings" title="Settings">
        <Settings2 size={17} strokeWidth={2.25} />
      </Link>

      <Link
        to="/dashboard/analytics"
        className="vfy-top-iconbtn"
        aria-label="Usage and activity"
        title="Usage"
      >
        <Bell size={17} strokeWidth={2.25} />
      </Link>

      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        <UserMenu afterSignOutUrl="/" />
      </div>

      {actions && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
    </header>
  );
}
