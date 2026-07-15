/**
 * Session-backed route guard. Checks Better Auth session via /api/auth/get-session.
 * Server routes still enforce auth independently.
 */
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthAccountProvider } from "../lib/auth/AuthAccountContext";
import { apiJson, getSession, type AuthUser } from "../lib/auth/client";

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
  const [state, setState] = useState<"loading" | "yes" | "no" | "admin-redirect">(
    "loading",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSession();
      if (cancelled) return;
      if (!session?.user) {
        clearAuthToken();
        setUser(null);
        setState("no");
        return;
      }

      setAuthToken(session.session.id);
      let nextUser = session.user;

      try {
        const me = await apiJson<{
          user: { platformRole?: "user" | "super_admin"; email?: string; name?: string };
        }>("/api/admin/me");
        if (me.user.platformRole === "super_admin") {
          nextUser = {
            ...nextUser,
            platformRole: "super_admin",
            email: me.user.email ?? nextUser.email,
            name: me.user.name ?? nextUser.name,
          };
        }
      } catch {
        /* tenant user — /api/admin/me returns 403 */
      }

      if (cancelled) return;
      setUser(nextUser);

      if (
        nextUser.platformRole === "super_admin" &&
        location.pathname.startsWith("/dashboard")
      ) {
        setState("admin-redirect");
        return;
      }
      setState("yes");
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

  if (state === "admin-redirect") {
    return <Navigate to="/admin" replace />;
  }

  if (state === "no" || !user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate to={`/auth?mode=signin&redirect=${redirect}`} replace />
    );
  }

  return (
    <AuthAccountProvider user={user}>
      <div data-user-email={user.email}>{children}</div>
    </AuthAccountProvider>
  );
}
