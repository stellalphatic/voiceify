export interface VoiceifyWidgetOptions {
  /** Embed public key from dashboard Deploy → Embed */
  token: string;
  /** API base URL, e.g. https://app.example.com */
  apiBase?: string;
  /** CSS selector or element to mount into */
  container?: string | HTMLElement;
}

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

export class VoiceifyWidget {
  readonly token: string;
  readonly apiBase: string;
  private root: HTMLElement | null = null;
  private session: EmbedSession | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(options: VoiceifyWidgetOptions) {
    this.token = options.token;
    this.apiBase = (options.apiBase ?? "").replace(/\/$/, "");
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
    panel.style.cssText =
      "font-family:Georgia,Times New Roman,serif;max-width:360px;padding:16px 18px;border:1px solid #d7d2c8;background:linear-gradient(160deg,#f7f4ef,#efe8dc);color:#1c1915;";

    const title = document.createElement("div");
    title.textContent = "Voiceify";
    title.style.cssText = "font-size:20px;font-weight:700;margin-bottom:4px;";

    const status = document.createElement("div");
    status.textContent = "Connecting…";
    status.style.cssText = "font-size:13px;opacity:0.75;margin-bottom:12px;";
    this.statusEl = status;

    const talkBtn = document.createElement("button");
    talkBtn.type = "button";
    talkBtn.textContent = "Start voice session";
    talkBtn.style.cssText =
      "appearance:none;border:1px solid #1c1915;background:#1c1915;color:#f7f4ef;padding:10px 14px;font:inherit;cursor:pointer;width:100%;";
    talkBtn.addEventListener("click", () => {
      void this.startSession();
    });

    panel.append(title, status, talkBtn);
    el.appendChild(panel);
    this.root = panel;
    void this.bootstrap();
    return panel;
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
    this.setStatus("Listening mode opens in host app sandbox for FYP demos.");
    // Host apps should use the dashboard sandbox /api/voice/:orgId/agents/:agentId/turn
    // with the session credentials. This widget bootstraps + displays agent state.
  }

  unmount(): void {
    this.root?.remove();
    this.root = null;
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
    mountVoiceifyWidget({
      token,
      apiBase: script.dataset.apiBase,
      container: target,
    });
  }
}
