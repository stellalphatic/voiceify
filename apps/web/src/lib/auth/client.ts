import { homePathForSuperAdmin } from "./console-mode";

const API_BASE = "";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  platformRole?: "user" | "super_admin";
};

export type AuthSession = {
  user: AuthUser;
  session: { id: string; expiresAt: string };
};

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}/api/auth${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}

function extractAuthError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  if (o.error && typeof o.error === "object") {
    const nested = o.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message;
    }
  }
  // Better Auth / better-call sometimes nests under `body` or `status`
  if (o.body && typeof o.body === "object") {
    const nested = o.body as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message;
    }
  }
  if (typeof o.statusText === "string" && o.statusText.trim()) {
    return o.statusText;
  }
  if (typeof o.code === "string" && o.code.trim()) {
    return `${fallback} (${o.code})`;
  }
  return fallback;
}

export async function getSession(): Promise<AuthSession | null> {
  const res = await authFetch("/get-session", { method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as AuthSession | null;
  if (!data?.user) return null;
  return data;
}

export async function signInEmail(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/sign-in/email", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: extractAuthError(body, `Sign in failed (${res.status})`),
    };
  }
  return { ok: true };
}

export async function signUpEmail(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/sign-up/email", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      name: input.name,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: unknown };
  if (!res.ok) {
    return {
      ok: false,
      error: extractAuthError(body, `Sign up failed (${res.status})`),
    };
  }
  // Better Auth answers 200 with `token: null` when the account was created but
  // no session was issued. Treat that as a failure so it surfaces as itself
  // rather than as a generic "could not start your session" further down.
  if (!body?.token) {
    return {
      ok: false,
      error:
        "Your account was created but the sign-in session could not be issued. Try signing in.",
    };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await authFetch("/sign-out", { method: "POST", body: "{}" }).catch(
    () => undefined,
  );
}

export async function requestPasswordReset(input: {
  email: string;
  redirectTo: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/request-password-reset", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      redirectTo: input.redirectTo,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: extractAuthError(body, `Password reset request failed (${res.status})`),
    };
  }
  return { ok: true };
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token: input.token,
      newPassword: input.newPassword,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: extractAuthError(body, `Password reset failed (${res.status})`),
    };
  }
  return { ok: true };
}

export function postAuthHomePath(user: AuthUser): "/admin" | "/dashboard" {
  if (user.platformRole === "super_admin") {
    return homePathForSuperAdmin();
  }
  return "/dashboard";
}

/** Prefer /api/admin/me when additionalFields are missing from the session payload. */
export async function resolvePostAuthHome(): Promise<"/admin" | "/dashboard"> {
  try {
    const me = await apiJson<{ user: { platformRole?: string } }>("/api/admin/me");
    if (me.user.platformRole === "super_admin") {
      return homePathForSuperAdmin();
    }
  } catch {
    /* not a platform admin */
  }
  const session = await getSession();
  if (session?.user?.platformRole === "super_admin") {
    return homePathForSuperAdmin();
  }
  return "/dashboard";
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await authFetch("/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: input.revokeOtherSessions ?? true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: extractAuthError(body, `Password change failed (${res.status})`),
    };
  }
  return { ok: true };
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
  };
  // Only set JSON content-type when body is a string (not FormData).
  if (!(init?.body instanceof FormData)) {
    (headers as Record<string, string>)["content-type"] =
      (headers as Record<string, string>)["content-type"] ?? "application/json";
  }
  const res = await fetch(path, {
    credentials: "include",
    headers,
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(
      body.error ?? body.message ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export const ORG_STORAGE_KEY = "voiceify.activeOrgId";
export const ORG_CHANGED_EVENT = "voiceify:active-org-changed";

export function getActiveOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveOrgId(orgId: string): void {
  try {
    localStorage.setItem(ORG_STORAGE_KEY, orgId);
    window.dispatchEvent(
      new CustomEvent(ORG_CHANGED_EVENT, { detail: { orgId } }),
    );
  } catch {
    /* ignore */
  }
}
