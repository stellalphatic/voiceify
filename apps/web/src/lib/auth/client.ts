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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: extractAuthError(body, `Sign up failed (${res.status})`),
    };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await authFetch("/sign-out", { method: "POST", body: "{}" }).catch(
    () => undefined,
  );
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
