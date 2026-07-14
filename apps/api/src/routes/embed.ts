import {
  agents,
  and,
  db,
  embedConfigs,
  eq,
  isNull,
} from "@voiceify/db";
import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireSession } from "../middleware/session.js";

export const embedRoutes = new Hono<AppEnv>();

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
        allowedOrigins: z.array(z.string()).default(["*"]),
        theme: z.record(z.unknown()).default({}),
      })
      .parse(await c.req.json());

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

    const snippet = `<script src="${process.env.APP_URL ?? ""}/widget.js" data-token="${publicKey}" async></script>`;
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

    const allowed = config.allowedOrigins ?? [];
    if (
      body.origin &&
      allowed.length &&
      !allowed.includes("*") &&
      !allowed.includes(body.origin)
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

    return c.json({
      sessionToken: `emb_${randomBytes(20).toString("hex")}`,
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
