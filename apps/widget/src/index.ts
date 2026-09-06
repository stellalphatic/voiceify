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

type WidgetMessage = { role: "user" | "assistant"; content: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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
  private chatBtn: HTMLButtonElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private messagesEl: HTMLElement | null = null;
  private session: EmbedSession | null = null;
  private conversationId: string | null = null;
  private messages: WidgetMessage[] = [];
  private recognition: SpeechRecognitionLike | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
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

    const modeRow = document.createElement("div");
    modeRow.style.cssText = "display:flex;gap:8px;margin-bottom:10px;";

    const talkBtn = document.createElement("button");
    talkBtn.type = "button";
    talkBtn.textContent = "Start voice";
    talkBtn.addEventListener("click", () => {
      void this.startVoiceSession();
    });
    this.talkBtn = talkBtn;

    const chatBtn = document.createElement("button");
    chatBtn.type = "button";
    chatBtn.textContent = "Chat";
    chatBtn.addEventListener("click", () => this.inputEl?.focus());
    this.chatBtn = chatBtn;
    modeRow.append(talkBtn, chatBtn);

    const messages = document.createElement("div");
    messages.setAttribute("aria-live", "polite");
    messages.style.cssText =
      "display:flex;flex-direction:column;gap:8px;max-height:240px;overflow:auto;margin:10px 0;font-size:13px;line-height:1.4;";
    this.messagesEl = messages;

    const inputRow = document.createElement("form");
    inputRow.style.cssText = "display:flex;gap:8px;";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a message";
    input.setAttribute("aria-label", "Message the voice agent");
    input.style.cssText =
      "min-width:0;flex:1;border:1px solid currentColor;border-radius:8px;padding:9px 10px;background:transparent;color:inherit;font:inherit;";
    this.inputEl = input;
    const send = document.createElement("button");
    send.type = "submit";
    send.textContent = "Send";
    send.style.cssText =
      "border:0;border-radius:8px;padding:9px 12px;background:#16a34a;color:white;font:inherit;font-weight:600;cursor:pointer;";
    inputRow.append(input, send);
    inputRow.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      void this.sendTurn(text, true);
    });

    panel.append(title, status, modeRow, messages, inputRow);
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
    this.talkBtn.style.cssText = `${styles.button}flex:1;`;
    if (this.chatBtn) {
      this.chatBtn.style.cssText = `${styles.button}flex:1;background:transparent;color:inherit;`;
    }
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
      if (this.session.agent.greeting && this.messages.length === 0) {
        this.appendMessage("assistant", this.session.agent.greeting);
      }
    } catch {
      this.setStatus("Unable to reach Voiceify API");
    }
  }

  private appendMessage(role: WidgetMessage["role"], content: string): void {
    this.messages.push({ role, content });
    if (!this.messagesEl) return;
    const bubble = document.createElement("div");
    bubble.textContent = content;
    bubble.style.cssText =
      role === "user"
        ? "align-self:flex-end;max-width:85%;padding:8px 10px;border-radius:10px 10px 2px 10px;background:#16a34a;color:white;"
        : "align-self:flex-start;max-width:85%;padding:8px 10px;border-radius:10px 10px 10px 2px;background:rgba(127,127,127,.16);";
    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private async validateSession(): Promise<boolean> {
    if (!this.session) {
      await this.bootstrap();
    }
    if (!this.session) {
      this.setStatus("Session unavailable");
      return false;
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
        return false;
      }
      return true;
    } catch {
      this.setStatus("Unable to validate the embed session");
      return false;
    }
  }

  private async startVoiceSession(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
      return;
    }
    if (!(await this.validateSession()) || !this.session) return;

    const Recognition = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;
    if (!Recognition) {
      this.setStatus("Voice input is not supported in this browser. Use chat instead.");
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const recognition = new Recognition();
      recognition.lang = this.session.agent.language === "Urdu" ? "ur-PK" : "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result?.[0]?.transcript?.trim();
        if (text) void this.sendTurn(text, false);
      };
      recognition.onerror = () => this.setStatus("I could not hear that. Try again.");
      recognition.onend = () => {
        this.recognition = null;
        this.mediaStream?.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
        if (this.talkBtn) this.talkBtn.textContent = "Start voice";
      };
      this.recognition = recognition;
      this.talkBtn!.textContent = "Listening…";
      this.setStatus("Listening");
      recognition.start();
    } catch {
      this.setStatus("Microphone permission is required for voice mode.");
    }
  }

  private async sendTurn(text: string, textOnly: boolean): Promise<void> {
    if (!(await this.validateSession()) || !this.session) return;
    this.appendMessage("user", text);
    this.setStatus("Thinking…");
    try {
      const response = await fetch(`${this.apiBase}/api/public/session/turn`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionToken: this.session.sessionToken,
          origin: window.location.origin,
          message: text,
          history: this.messages.slice(-12, -1),
          textOnly,
          ...(this.conversationId ? { conversationId: this.conversationId } : {}),
        }),
      });
      if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(error.error ?? "Agent unavailable");
      }
      this.conversationId = response.headers.get("x-conversation-id") ?? this.conversationId;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      const audio: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: string;
            text?: string;
            data?: string;
            message?: string;
          };
          if (event.type === "text" && event.text) reply = event.text;
          if (event.type === "audio" && event.data) {
            const raw = atob(event.data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
            audio.push(bytes);
          }
          if (event.type === "error") throw new Error(event.message ?? "Agent turn failed");
        }
      }
      if (reply) this.appendMessage("assistant", reply);
      if (!textOnly && audio.length > 0) await this.playPcm(audio);
      this.setStatus(`${this.session.agent.name} ready`);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : "Agent turn failed");
    }
  }

  private async playPcm(chunks: Uint8Array[]): Promise<void> {
    const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const samples = new Int16Array(bytes.buffer);
    const context = this.audioContext ?? new AudioContext({ sampleRate: 22_050 });
    this.audioContext = context;
    if (context.state === "suspended") await context.resume();
    const audioBuffer = context.createBuffer(1, samples.length, 22_050);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) channel[i] = (samples[i] ?? 0) / 32768;
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.start();
  }

  unmount(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.themeMql = null;
    this.root?.remove();
    this.root = null;
    this.titleEl = null;
    this.statusEl = null;
    this.talkBtn = null;
    this.chatBtn = null;
    this.inputEl = null;
    this.messagesEl = null;
    this.session = null;
    this.conversationId = null;
    this.messages = [];
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
