/**
 * Session-backed route guard. Checks Better Auth session via /api/auth/get-session.
 * Server routes still enforce auth independently.
 */
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, type AuthUser } from "../lib/auth/client";

export const VOICEIFY_AUTH_TOKEN_KEY = "voiceify.auth.token";

/** @deprecated Use getSession() — kept for legacy tests during migration. */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const token = window.localStorage.getItem(VOICEIFY_AUTH_TOKEN_KEY);
    return !!token && token.length > 0;
  } catch {
    return false;
  }
}

export function setAuthToken(token: string) {
  try {
    window.localStorage.setItem(VOICEIFY_AUTH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(VOICEIFY_AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "yes" | "no">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSession();
      if (cancelled) return;
      if (session?.user) {
        setAuthToken(session.session.id);
        setUser(session.user);
        setState("yes");
      } else {
        clearAuthToken();
        setState("no");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div style={{ padding: 48, textAlign: "center", opacity: 0.7 }}>
        Checking session…
      </div>
    );
  }

  if (state === "no") {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate to={`/auth?mode=signin&redirect=${redirect}`} replace />
    );
  }

  return (
    <div data-user-email={user?.email ?? undefined}>{children}</div>
  );
}
