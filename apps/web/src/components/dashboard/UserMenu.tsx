/**
 * UserMenu.tsx — Lightweight avatar + dropdown for the dashboard.
 *
 * Replaces the previous <UserButton /> from @clerk/nextjs which crashed at runtime
 * because the app is a Vite + React Router SPA (not Next.js) with no <ClerkProvider>
 * in the tree. This component has no real auth state — sign-out simply navigates
 * the user back to "/" (matching the original `afterSignOutUrl="/"` behaviour).
 * Clears the demo auth token from localStorage on sign-out.
 *
 * Drop-in usage:
 *     <UserMenu name="Alex Carter" email="alex@voiceify.ai" />
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { clearAuthToken } from '../RequireAuth';
import { signOut } from '../../lib/auth/client';

interface Props {
  name?:  string;
  email?: string;
  /** Where to navigate after sign-out (default "/") */
  afterSignOutUrl?: string;
}

function initialsOf(name = 'User') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export default function UserMenu({
  name  = 'Demo User',
  email = 'demo@voiceify.ai',
  afterSignOutUrl = '/',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-none border border-voice-border bg-voice-surface flex items-center justify-center text-sm font-semibold text-voice-text hover:border-voice-accent transition-colors"
        title={name}
      >
        {initialsOf(name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-none border border-voice-border bg-voice-surface shadow-2xl shadow-black/40 overflow-hidden z-50"
        >
          {/* Identity header */}
          <div className="px-4 py-3 border-b border-voice-frost-border">
            <p className="text-sm font-semibold text-voice-text truncate">{name}</p>
            <p className="text-xs text-voice-muted truncate">{email}</p>
          </div>

          {/* Items */}
          <Link
            to="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-voice-text hover:bg-voice-frost-base transition-colors"
          >
            <User className="w-4 h-4 opacity-70" />
            Profile
          </Link>
          <Link
            to="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-voice-text hover:bg-voice-frost-base transition-colors"
          >
            <Settings className="w-4 h-4 opacity-70" />
            Settings
          </Link>

          <div className="border-t border-voice-frost-border" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-voice-text hover:bg-voice-frost-base transition-colors text-left"
          >
            <LogOut className="w-4 h-4 opacity-70" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
