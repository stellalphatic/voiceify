import "dotenv/config";
import { serve } from "@hono/node-server";
import { auth } from "@voiceify/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./lib/types.js";
import { adminRoutes } from "./routes/admin.js";
import { agentsRoutes } from "./routes/agents.js";
import { automationsRoutes } from "./routes/automations.js";
import { conversationsRoutes } from "./routes/conversations.js";
import { embedRoutes } from "./routes/embed.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { openapiRoutes } from "./routes/openapi.js";
import { orgsRoutes } from "./routes/orgs.js";
import { toolsRoutes } from "./routes/tools.js";
import { usageRoutes } from "./routes/usage.js";
import { voiceRoutes } from "./routes/voice.js";

const PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: [WEB_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-voiceify-key",
      "x-org-id",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "voiceify-api",
    ts: new Date().toISOString(),
  }),
);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/admin", adminRoutes);
app.route("/api/orgs", orgsRoutes);
app.route("/api/orgs", agentsRoutes);
app.route("/api/orgs", toolsRoutes);
app.route("/api", automationsRoutes);
app.route("/api/orgs", usageRoutes);
app.route("/api/orgs", knowledgeRoutes);
app.route("/api/orgs", conversationsRoutes);
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
