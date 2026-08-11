export interface VoiceifyWidgetOptions {
  /** Embed public key from dashboard Deploy → Embed */
  token: string;
  /**
   * Voiceify API origin. Defaults to the origin this script was served from,
   * which is the Voiceify deployment, so an embed on a customer domain does not
   * silently call the customer's own server.
   */
  apiBase?: string;
  /** CSS selector or element to mount into */
  container?: string | HTMLElement;
  /**
   * Visual theme. `auto` follows the host page `data-theme` or
   * `prefers-color-scheme`. Defaults to `auto`.
   */
  theme?: "light" | "dark" | "auto";
}

/**
 * document.currentScript is only readable while the script first executes, so
 * capture the origin now rather than when a host app constructs the widget.
 */
const SCRIPT_ORIGIN: string = (() => {
  if (typeof document === "undefined") return "";
  const src = (document.currentScript as HTMLScriptElement | null)?.src;
  if (!src) return "";
  try {
    return new URL(src, document.baseURI).origin;
  } catch {
    return "";
  }
})();

type EmbedSession = {
  sessionToken: string;
  orgId: string;
  agentId: string;
  agent: {
    name: string;
    greeting?: string | null;
    language: string;
    voiceId?: string | null;
  };
  theme?: Record<string, unknown>;
};

type ResolvedTheme = "light" | "dark";

const THEME_STYLES: Record<
  ResolvedTheme,
  { panel: string; title: string; status: string; button: string }
> = {
  light: {
    panel:
      "font-family:Inter,system-ui,-apple-system,sans-serif;max-width:360px;padding:16px 18px;border:1px solid #e7e5e4;border-radius:12px;background:#f5f5f4;color:#0c0a09;",
    title: "font-size:18px;font-weight:600;letter-spacing:-0.02em;margin-bottom:4px;",
    status: "font-size:13px;opacity:0.75;margin-bottom:12px;line-height:1.45;",
    button:
      "appearance:none;border:1px solid #292524;background:#292524;color:#fafaf9;padding:10px 14px;font:inherit;cursor:pointer;width:100%;border-radius:999px;font-weight:500;",
  },
  dark: {
    panel:
      "font-family:Inter,system-ui,-apple-system,sans-serif;max-width:360px;padding:16px 18px;border:1px solid #44403c;border-radius:12px;background:#1c1917;color:#fafaf9;",
    title: "font-size:18px;font-weight:600;letter-spacing:-0.02em;margin-bottom:4px;",
    status: "font-size:13px;opacity:0.75;margin-bottom:12px;line-height:1.45;",
    button:
      "appearance:none;border:1px solid #fafaf9;background:#fafaf9;color:#0c0a09;padding:10px 14px;font:inherit;cursor:pointer;width:100%;border-radius:999px;font-weight:500;",
  },
};

function resolveHostTheme(preferred?: "light" | "dark" | "auto"): ResolvedTheme {
  if (preferred === "light" || preferred === "dark") return preferred;

  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  }

  return "light";
}

export class VoiceifyWidget {
  readonly token: string;
  readonly apiBase: string;
  private themeMode: "light" | "dark" | "auto";
  private resolvedTheme: ResolvedTheme = "light";
  private root: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private talkBtn: HTMLButtonElement | null = null;
  private session: EmbedSession | null = null;
  private themeMql: MediaQueryList | null = null;
  private themeObserver: MutationObserver | null = null;

  constructor(options: VoiceifyWidgetOptions) {
    this.token = options.token;
    this.apiBase = (options.apiBase ?? SCRIPT_ORIGIN).replace(/\/$/, "");
    this.themeMode = options.theme ?? "auto";
    this.resolvedTheme = resolveHostTheme(this.themeMode);
    if (options.container) {
      this.mount(options.container);
    }
  }

  mount(container: string | HTMLElement): HTMLElement {
    const el =
      typeof container === "string"
        ? document.querySelector<HTMLElement>(container)
        : container;
    if (!el) {
      throw new Error(`VoiceifyWidget: container not found (${String(container)})`);
    }

    el.innerHTML = "";
    const panel = document.createElement("div");
    panel.dataset.voiceifyWidget = "true";
    panel.dataset.theme = this.resolvedTheme;

    const title = document.createElement("div");
    title.textContent = "Voiceify";
    this.titleEl = title;

    const status = document.createElement("div");
    status.textContent = "Connecting…";
    this.statusEl = status;

    const talkBtn = document.createElement("button");
    talkBtn.type = "button";
    talkBtn.textContent = "Preview embed";
    talkBtn.addEventListener("click", () => {
      void this.startSession();
    });
    this.talkBtn = talkBtn;

    panel.append(title, status, talkBtn);
    el.appendChild(panel);
    this.root = panel;
    this.applyThemeStyles();
    this.watchTheme();
    void this.bootstrap();
    return panel;
  }

  private applyThemeStyles(): void {
    if (!this.root || !this.titleEl || !this.statusEl || !this.talkBtn) return;
    const styles = THEME_STYLES[this.resolvedTheme];
    this.root.style.cssText = styles.panel;
    this.root.dataset.theme = this.resolvedTheme;
    this.titleEl.style.cssText = styles.title;
    this.statusEl.style.cssText = styles.status;
    this.talkBtn.style.cssText = styles.button;
  }

  private setResolvedTheme(next: ResolvedTheme): void {
    if (this.resolvedTheme === next) return;
    this.resolvedTheme = next;
    this.applyThemeStyles();
  }

  private watchTheme(): void {
    if (this.themeMode !== "auto" || typeof window === "undefined") return;

    this.themeMql = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      this.setResolvedTheme(resolveHostTheme("auto"));
    };
    this.themeMql.addEventListener?.("change", onScheme);

    this.themeObserver = new MutationObserver(() => {
      this.setResolvedTheme(resolveHostTheme("auto"));
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  private async bootstrap(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBase}/api/public/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey: this.token,
          origin: window.location.origin,
        }),
      });
      if (!res.ok) {
        this.setStatus("Embed key rejected");
        return;
      }
      this.session = (await res.json()) as EmbedSession;

      const sessionTheme = this.session.theme?.mode;
      if (
        this.themeMode === "auto" &&
        (sessionTheme === "light" || sessionTheme === "dark")
      ) {
        this.setResolvedTheme(sessionTheme);
      }

      this.setStatus(
        `${this.session.agent.name} ready${
          this.session.agent.greeting ? ` — ${this.session.agent.greeting}` : ""
        }`,
      );
    } catch {
      this.setStatus("Unable to reach Voiceify API");
    }
  }

  private async startSession(): Promise<void> {
    if (!this.session) {
      await this.bootstrap();
    }
    if (!this.session) {
      this.setStatus("Session unavailable");
      return;
    }
    try {
      const validation = await fetch(
        `${this.apiBase}/api/public/session/validate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionToken: this.session.sessionToken,
            origin: window.location.origin,
          }),
        },
      );
      if (!validation.ok) {
        this.session = null;
        this.setStatus("Session expired. Reconnecting…");
        await this.bootstrap();
        return;
      }

      /**
       * In-widget audio is not implemented yet. Say so plainly instead of
       * implying a voice call started.
       */
      this.setStatus(
        `${this.session.agent.name} is authenticated, but in-widget voice is still in preview. Use the dashboard Sandbox for a live conversation.`,
      );
    } catch {
      this.setStatus("Unable to validate the embed session");
    }
  }

  unmount(): void {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.themeMql = null;
    this.root?.remove();
    this.root = null;
    this.titleEl = null;
    this.statusEl = null;
    this.talkBtn = null;
    this.session = null;
  }
}

export function mountVoiceifyWidget(options: VoiceifyWidgetOptions): VoiceifyWidget {
  return new VoiceifyWidget(options);
}

declare global {
  interface Window {
    VoiceifyWidget: typeof VoiceifyWidget;
    mountVoiceifyWidget: typeof mountVoiceifyWidget;
  }
}

if (typeof window !== "undefined") {
  window.VoiceifyWidget = VoiceifyWidget;
  window.mountVoiceifyWidget = mountVoiceifyWidget;

  // Auto-mount from <script data-token="...">
  const script = document.currentScript as HTMLScriptElement | null;
  const token = script?.dataset?.token;
  if (token) {
    const mountId = script.dataset.mount || "voiceify-widget";
    let target = document.getElementById(mountId);
    if (!target) {
      target = document.createElement("div");
      target.id = mountId;
      document.body.appendChild(target);
    }
    const themeAttr = script.dataset.theme;
    const theme =
      themeAttr === "light" || themeAttr === "dark" || themeAttr === "auto"
        ? themeAttr
        : "auto";
    mountVoiceifyWidget({
      token,
      apiBase: script.dataset.apiBase,
      container: target,
      theme,
    });
  }
}
