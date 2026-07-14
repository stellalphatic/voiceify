const API_BASE = "";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
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
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? "Sign in failed" };
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
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? "Sign up failed" };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await authFetch("/sign-out", { method: "POST", body: "{}" }).catch(() => undefined);
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const ORG_STORAGE_KEY = "voiceify.activeOrgId";

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
  } catch {
    /* ignore */
  }
}
