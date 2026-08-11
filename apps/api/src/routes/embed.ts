import {
  agents,
  and,
  db,
  embedConfigs,
  embedSessions,
  eq,
  gt,
  isNull,
} from "@voiceify/db";
import { createHash, randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireSession } from "../middleware/session.js";

export const embedRoutes = new Hono<AppEnv>();

const allowedOriginSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "*") return true;
    try {
      const parsed = new URL(value);
      return parsed.origin === value.replace(/\/$/, "");
    } catch {
      return false;
    }
  }, "Use an origin such as https://example.com (no path)");

function hashEmbedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

embedRoutes.get(
  "/orgs/:orgId/embed",
  requireSession,
  requireOrg("embed:manage"),
  async (c) => {
    const orgId = c.get("orgId");
    const configs = await db
      .select()
      .from(embedConfigs)
      .where(eq(embedConfigs.orgId, orgId));
    return c.json({ configs });
  },
);

embedRoutes.post(
  "/orgs/:orgId/embed",
  requireSession,
  requireOrg("embed:manage"),
  async (c) => {
    const orgId = c.get("orgId");
    const body = z
      .object({
        agentId: z.string().uuid(),
        allowedOrigins: z.array(allowedOriginSchema).min(1).max(50),
        theme: z.record(z.unknown()).default({}),
      })
      .parse(await c.req.json());

    if (
      body.allowedOrigins.includes("*") &&
      process.env.ALLOW_WILDCARD_EMBEDS !== "true"
    ) {
      return c.json(
        {
          error:
            "Wildcard embeds are disabled. Add explicit website origins or set ALLOW_WILDCARD_EMBEDS=true intentionally.",
        },
        400,
      );
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, body.agentId),
          eq(agents.orgId, orgId),
          isNull(agents.deletedAt),
        ),
      )
      .limit(1);
    if (!agent) return c.json({ error: "Agent not found" }, 404);

    const publicKey = `vw_${randomBytes(16).toString("hex")}`;
    const [config] = await db
      .insert(embedConfigs)
      .values({
        orgId,
        agentId: body.agentId,
        publicKey,
        allowedOrigins: body.allowedOrigins,
        theme: body.theme,
      })
      .returning();

    /*
     * An empty base makes the snippet resolve /widget.js against the customer's
     * own domain, where it does not exist. WEB_ORIGIN is already required for
     * CORS, so fall back to it before giving up on an absolute URL.
     */
    const appOrigin = (
      process.env.APP_URL ||
      process.env.WEB_ORIGIN ||
      new URL(c.req.url).origin
    ).replace(/\/$/, "");
    const snippet = `<script src="${appOrigin}/widget.js" data-token="${publicKey}" async></script>`;
    return c.json({ config, snippet }, 201);
  },
);

/** Public session bootstrap for widget (rate limited). */
embedRoutes.post(
  "/public/session",
  rateLimit({ prefix: "embed", limit: 30 }),
  async (c) => {
    const body = z
      .object({
        publicKey: z.string().min(8),
        origin: z.string().optional(),
      })
      .parse(await c.req.json());

    const [config] = await db
      .select()
      .from(embedConfigs)
      .where(eq(embedConfigs.publicKey, body.publicKey))
      .limit(1);
    if (!config) return c.json({ error: "Invalid embed key" }, 401);

    const requestedOrigin = c.req.header("origin") || body.origin;
    if (!requestedOrigin) {
      return c.json({ error: "Embed origin is required" }, 400);
    }
    let normalizedOrigin: string;
    try {
      normalizedOrigin = new URL(requestedOrigin).origin;
    } catch {
      return c.json({ error: "Invalid embed origin" }, 400);
    }

    const allowed = config.allowedOrigins ?? [];
    if (
      allowed.length === 0 ||
      (
      !allowed.includes("*") &&
      !allowed.includes(normalizedOrigin)
      )
    ) {
      return c.json({ error: "Origin not allowed" }, 403);
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, config.agentId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent || agent.status !== "active") {
      return c.json({ error: "Agent not deployed" }, 409);
    }

    const sessionToken = `emb_${randomBytes(32).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(embedSessions).values({
      configId: config.id,
      orgId: config.orgId,
      agentId: agent.id,
      tokenHash: hashEmbedToken(sessionToken),
      origin: normalizedOrigin,
      expiresAt,
    });

    return c.json({
      sessionToken,
      orgId: config.orgId,
      agentId: agent.id,
      agent: {
        name: agent.name,
        greeting: agent.greeting,
        language: agent.language,
        voiceId: agent.voiceId,
      },
      theme: config.theme,
      expiresIn: 3600,
    });
  },
);

/** Re-check an embed token before any interactive action. */
embedRoutes.post(
  "/public/session/validate",
  rateLimit({ prefix: "embed-validate", limit: 60 }),
  async (c) => {
    const body = z
      .object({
        sessionToken: z.string().startsWith("emb_").min(68),
        origin: z.string().optional(),
      })
      .parse(await c.req.json());
    const requestedOrigin = c.req.header("origin") || body.origin;
    if (!requestedOrigin) return c.json({ error: "Embed origin is required" }, 400);

    let origin: string;
    try {
      origin = new URL(requestedOrigin).origin;
    } catch {
      return c.json({ error: "Invalid embed origin" }, 400);
    }

    const [session] = await db
      .select()
      .from(embedSessions)
      .where(
        and(
          eq(embedSessions.tokenHash, hashEmbedToken(body.sessionToken)),
          eq(embedSessions.origin, origin),
          gt(embedSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) return c.json({ error: "Invalid or expired embed session" }, 401);

    await db
      .update(embedSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(embedSessions.id, session.id));

    return c.json({
      ok: true,
      orgId: session.orgId,
      agentId: session.agentId,
      expiresAt: session.expiresAt.toISOString(),
    });
  },
);
