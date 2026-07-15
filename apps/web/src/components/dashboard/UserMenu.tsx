/**
 * UserMenu — avatar + dropdown backed by the authenticated session.
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-none border border-voice-border bg-voice-surface flex items-center justify-center text-sm font-semibold text-voice-text hover:border-voice-accent transition-colors"
        title={resolvedName}
      >
        {initialsOf(resolvedName)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-none border border-voice-border bg-voice-surface shadow-lg z-50 py-1"
        >
          <div className="px-3 py-2 border-b border-voice-border">
            <p className="text-sm font-medium text-voice-text truncate">{resolvedName}</p>
            <p className="text-xs text-voice-muted truncate">{resolvedEmail}</p>
          </div>
          <Link
            to="/dashboard/settings"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-voice-text hover:bg-voice-border/40"
            onClick={() => setOpen(false)}
          >
            <Settings size={14} />
            Settings
          </Link>
          <Link
            to="/dashboard"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-voice-text hover:bg-voice-border/40"
            onClick={() => setOpen(false)}
          >
            <User size={14} />
            Workspace
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-voice-text hover:bg-voice-border/40"
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
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-voice-text hover:bg-voice-border/40 text-left"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
