import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, KeyRound, Mic, Sparkles, Waves } from "lucide-react";

type Health = {
  gemini?: boolean;
  groq?: boolean;
  elevenlabs?: boolean;
  emailConfigured?: boolean;
};

export default function IntegrationsWorkspace() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { credentials: "include" });
        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
        const data = (await res.json()) as Health;
        if (!cancelled) setHealth(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load provider status");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providers = [
    {
      name: "ElevenLabs",
      role: "Speech-to-text (Scribe) and text-to-speech",
      ok: health?.elevenlabs,
      icon: Mic,
    },
    {
      name: "Groq",
      role: "Primary LLM for live agent replies",
      ok: health?.groq,
      icon: Sparkles,
    },
    {
      name: "Gemini",
      role: "Optional LLM fallback",
      ok: health?.gemini,
      icon: Waves,
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="vfy-page-head">
        <div className="vfy-page-head-titles">
          <p className="vfy-page-eyebrow">// manage · integrations</p>
          <h1 className="vfy-page-title">Integrations</h1>
          <p className="vfy-page-sub">
            Voiceify runs STT, LLM, and TTS on the server. Tenant workspaces connect via API keys and
            embed widgets, not by pasting provider secrets in the browser.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--d-danger)" }}>
          {error}
        </p>
      )}

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">Voice pipeline (platform)</h3>
        <p className="vfy-settings-help">
          Status reflects keys configured on the API host. Platform operators manage these in server
          environment variables, not in the tenant dashboard.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {providers.map((p) => {
            const Icon = p.icon;
            const ready = p.ok === true;
            return (
              <article key={p.name} className="vfy-settings-list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} />
                  <p className="vfy-settings-item-title">{p.name}</p>
                </div>
                <p className="vfy-settings-item-meta">{p.role}</p>
                <p className="vfy-settings-item-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  {ready ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                  {health == null ? "Checking…" : ready ? "Configured" : "Not configured"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vfy-settings-card">
        <h3 className="vfy-settings-card-title">
          <KeyRound size={18} />
          Connect your product
        </h3>
        <p className="vfy-settings-help">
          Create a <code>vfk_</code> API key for server-to-server calls, or a <code>vw_</code> embed
          token for the browser widget.
        </p>
        <Link to="/dashboard/settings" className="vfy-btn vfy-btn-primary" style={{ display: "inline-flex" }}>
          Open API keys &amp; embed
        </Link>
      </section>
    </div>
  );
}
