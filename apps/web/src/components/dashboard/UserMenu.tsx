/**
 * UserMenu — avatar + dropdown with high-contrast dashboard tokens.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Shield, User } from 'lucide-react';
import { clearAuthToken } from '../RequireAuth';
import { signOut } from '../../lib/auth/client';
import { useAuthAccountOptional } from '../../lib/auth/AuthAccountContext';
import { setConsoleMode } from '../../lib/auth/console-mode';

interface Props {
  name?: string;
  email?: string;
  afterSignOutUrl?: string;
}

function initialsOf(name = 'User') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

export default function UserMenu({
  name,
  email,
  afterSignOutUrl = '/',
}: Props) {
  const account = useAuthAccountOptional();
  const resolvedName = name ?? account?.user.name ?? 'Account';
  const resolvedEmail = email ?? account?.user.email ?? '';
  const isAdmin = account?.user.platformRole === 'super_admin';

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  const handleSignOut = () => {
    setOpen(false);
    void (async () => {
      await signOut();
      clearAuthToken();
      navigate(afterSignOutUrl);
    })();
  };

  return (
    <div ref={ref} className="vfy-user-menu">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="vfy-user-menu-trigger"
        title={resolvedName}
      >
        {initialsOf(resolvedName)}
      </button>

      {open && (
        <div role="menu" className="vfy-user-menu-panel">
          <div className="vfy-user-menu-head">
            <p className="vfy-user-menu-name">{resolvedName}</p>
            <p className="vfy-user-menu-email">{resolvedEmail}</p>
          </div>
          <Link
            to="/dashboard/settings"
            role="menuitem"
            className="vfy-user-menu-item"
            onClick={() => setOpen(false)}
          >
            <Settings size={14} />
            Settings
          </Link>
          <Link
            to="/dashboard"
            role="menuitem"
            className="vfy-user-menu-item"
            onClick={() => setOpen(false)}
          >
            <User size={14} />
            Workspace
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              className="vfy-user-menu-item"
              onClick={() => {
                setConsoleMode('admin');
                setOpen(false);
              }}
            >
              <Shield size={14} />
              Super admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="vfy-user-menu-item"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
