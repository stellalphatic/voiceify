import "dotenv/config";
import { serve } from "@hono/node-server";
import { auth } from "@voiceify/auth";
import { handleHealth } from "@voiceify/voice";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./lib/types.js";
import { adminRoutes } from "./routes/admin.js";
import { agentsRoutes } from "./routes/agents.js";
import { automationsRoutes } from "./routes/automations.js";
import { contactRoutes } from "./routes/contact.js";
import { conversationsRoutes } from "./routes/conversations.js";
import { embedRoutes } from "./routes/embed.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { openapiRoutes } from "./routes/openapi.js";
import { orgsRoutes } from "./routes/orgs.js";
import { privacyRoutes } from "./routes/privacy.js";
import { toolsRoutes } from "./routes/tools.js";
import { usageRoutes } from "./routes/usage.js";
import { voiceRoutes } from "./routes/voice.js";

const PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

/** Build CORS allowlist from WEB_ORIGIN + BETTER_AUTH_TRUSTED_ORIGINS + local defaults. */
function corsOrigins(): string[] {
  const fromTrusted = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const defaults = [
    WEB_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
  ];
  return [...new Set([...defaults, ...fromTrusted])];
}

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: corsOrigins(),
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-voiceify-key",
      "x-org-id",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["x-conversation-id", "x-credits-soft-warn"],
    credentials: true,
  }),
);

function healthPayload() {
  const emailConfigured = Boolean(
    (process.env.RESEND_API_KEY ?? "").trim().replace(/^["']|["']$/g, ""),
  );
  return {
    ok: true as const,
    status: "ok" as const,
    service: "voiceify-api",
    ts: new Date().toISOString(),
    emailConfigured,
  };
}

app.get("/health", async (c) => {
  const voice = await handleHealth().json();
  return c.json({ ...healthPayload(), ...voice, ok: true, status: "ok" });
});

/** Dashboard / voice client historically probes /api/health */
app.get("/api/health", async (c) => {
  const voice = await handleHealth().json();
  return c.json({ ...healthPayload(), ...voice, ok: true, status: "ok" });
});

app.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/api/auth/*", (c) =>
  auth.handler(c.req.raw),
);

app.route("/api/admin", adminRoutes);
app.route("/api/orgs", orgsRoutes);
app.route("/api/orgs", agentsRoutes);
app.route("/api/orgs", toolsRoutes);
app.route("/api", automationsRoutes);
app.route("/api/orgs", usageRoutes);
app.route("/api/orgs", knowledgeRoutes);
app.route("/api/orgs", conversationsRoutes);
app.route("/api/orgs", privacyRoutes);
app.route("/api", contactRoutes);
app.route("/api", embedRoutes);
app.route("/api/voice", voiceRoutes);
app.route("/api", openapiRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error("[api]", err);
  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    return c.json({ error: "Validation failed", details: err }, 400);
  }
  return c.json(
    { error: err instanceof Error ? err.message : "Internal server error" },
    500,
  );
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.info(`[api] listening on http://localhost:${info.port}`);
});

export default app;
