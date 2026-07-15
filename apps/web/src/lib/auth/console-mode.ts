/**
 * Super-admin console mode: Admin portal vs tenant workspace.
 * Persisted so operators can use both sides of the product.
 */

export type ConsoleMode = "admin" | "workspace";

export const CONSOLE_MODE_KEY = "voiceify.consoleMode";

export function getConsoleMode(): ConsoleMode {
  try {
    const v = localStorage.getItem(CONSOLE_MODE_KEY);
    if (v === "workspace" || v === "admin") return v;
  } catch {
    /* ignore */
  }
  return "admin";
}

export function setConsoleMode(mode: ConsoleMode): void {
  try {
    localStorage.setItem(CONSOLE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function homePathForSuperAdmin(mode: ConsoleMode = getConsoleMode()): "/admin" | "/dashboard" {
  return mode === "workspace" ? "/dashboard" : "/admin";
}
