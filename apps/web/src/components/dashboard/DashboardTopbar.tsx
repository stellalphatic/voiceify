import { useState } from 'react';
import { Bell, BookOpen, ChevronRight, Menu, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import UserMenu from './UserMenu';
import CommandPalette, { TopbarSearchTrigger } from './CommandPalette';
import type { ReactNode } from 'react';

interface Crumb {
  label: string;
  to?: string;
}

interface DashboardTopbarProps {
  crumbs: Crumb[];
  actions?: ReactNode;
  onMenuClick: () => void;
}

export default function DashboardTopbar({ crumbs, actions, onMenuClick }: DashboardTopbarProps) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <>
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

        <TopbarSearchTrigger onOpen={() => setCmdOpen(true)} />

        <span className="vfy-top-status" aria-label="System status: live">
          <span className="vfy-top-status-dot" />
          <span>Live</span>
        </span>

        <Link to="/docs" className="vfy-top-docs" title="API documentation">
          <BookOpen size={15} strokeWidth={2.25} />
          <span>Docs</span>
        </Link>

        <span className="vfy-top-theme">
          <ThemeToggle size="sm" />
        </span>

        <Link to="/dashboard/settings" className="vfy-top-iconbtn" aria-label="Settings" title="Settings">
          <Settings2 size={17} strokeWidth={2.25} />
        </Link>

        <Link
          to="/dashboard/conversations"
          className="vfy-top-iconbtn"
          aria-label="Conversations"
          title="Conversations"
        >
          <Bell size={17} strokeWidth={2.25} />
        </Link>

        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          <UserMenu afterSignOutUrl="/" />
        </div>

        {actions && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
