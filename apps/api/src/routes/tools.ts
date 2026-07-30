import {
  and,
  db,
  eq,
  isNull,
  or,
  tools,
  webhooks,
} from "@voiceify/db";
import { executeHttpTool, parseHttpToolDefinition } from "@voiceify/tools";
import { createHmac, randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const toolsRoutes = new Hono<AppEnv>();

toolsRoutes.use("*", requireSession);

const toolCreateSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/i),
  description: z.string().max(500).optional(),
  type: z.enum(["http", "builtin", "pack"]).default("http"),
  config: z.record(z.unknown()).default({}),
  inputSchema: z.record(z.unknown()).default({}),
});

toolsRoutes.get("/:orgId/tools", requireOrg("agents:read"), async (c) => {
  const orgId = c.get("orgId");
  const rows = await db
    .select()
    .from(tools)
    .where(or(eq(tools.orgId, orgId), isNull(tools.orgId)));
  return c.json({ tools: rows });
});

toolsRoutes.post("/:orgId/tools", requireOrg("agents:write"), async (c) => {
  const orgId = c.get("orgId");
  const parsed = toolCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid tool payload" },
      400,
    );
  }
  const input = parsed.data;
  if (input.type === "http") {
    try {
      parseHttpToolDefinition({
        name: input.slug,
        description: input.description || input.name,
        ...input.config,
      });
    } catch (err) {
      return c.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Invalid HTTP tool configuration (check URL and method)",
        },
        400,
      );
    }
  }

  try {
    const [row] = await db
      .insert(tools)
      .values({
        orgId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? "",
        type: input.type,
        config: input.config,
        inputSchema: input.inputSchema,
      })
      .returning();

    return c.json({ tool: row }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create tool";
    if (/unique|duplicate/i.test(msg)) {
      return c.json({ error: "A tool with this slug already exists" }, 409);
    }
    return c.json({ error: msg }, 500);
  }
});

toolsRoutes.patch(
  "/:orgId/tools/:toolId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const toolId = c.req.param("toolId");
    const parsed = z
      .object({
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(500).optional(),
        config: z.record(z.unknown()).optional(),
        inputSchema: z.record(z.unknown()).optional(),
      })
      .safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid tool update" },
        400,
      );
    }
    const body = parsed.data;

    const [tool] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, toolId), eq(tools.orgId, orgId)))
      .limit(1);
    if (!tool) return c.json({ error: "Tool not found" }, 404);

    const nextConfig = body.config ?? tool.config;
    if (tool.type === "http") {
      try {
        parseHttpToolDefinition({
          name: tool.slug,
          description: body.description ?? tool.description ?? tool.name,
          ...nextConfig,
        });
      } catch (err) {
        return c.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Invalid HTTP tool configuration (check URL and method)",
          },
          400,
        );
      }
    }

    const [row] = await db
      .update(tools)
      .set({
        name: body.name ?? tool.name,
        description: body.description ?? tool.description,
        config: nextConfig,
        inputSchema: body.inputSchema ?? tool.inputSchema,
      })
      .where(eq(tools.id, toolId))
      .returning();

    return c.json({ tool: row });
  },
);

toolsRoutes.delete(
  "/:orgId/tools/:toolId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const toolId = c.req.param("toolId");
    await db
      .delete(tools)
      .where(and(eq(tools.id, toolId), eq(tools.orgId, orgId)));
    return c.json({ ok: true });
  },
);

toolsRoutes.post(
  "/:orgId/tools/:toolId/test",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const toolId = c.req.param("toolId");
    const body = z
      .object({ args: z.record(z.unknown()).default({}) })
      .parse(await c.req.json().catch(() => ({ args: {} })));

    const [tool] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, toolId), eq(tools.orgId, orgId)))
      .limit(1);
    if (!tool) return c.json({ error: "Tool not found" }, 404);
    if (tool.type !== "http") {
      return c.json({ error: "Only HTTP tools can be tested here" }, 400);
    }

    const result = await executeHttpTool(
      {
        name: tool.slug,
        description: tool.description,
        ...tool.config,
      },
      body.args,
    );
    return c.json({ result });
  },
);

toolsRoutes.get("/:orgId/webhooks", requireOrg("webhooks:manage"), async (c) => {
  const orgId = c.get("orgId");
  const rows = await db.select().from(webhooks).where(eq(webhooks.orgId, orgId));
  return c.json({
    webhooks: rows.map((w) => ({
      ...w,
      secret: undefined,
      secretPreview: `${w.secret.slice(0, 6)}…`,
    })),
  });
});

toolsRoutes.post("/:orgId/webhooks", requireOrg("webhooks:manage"), async (c) => {
  const orgId = c.get("orgId");
  const body = z
    .object({
      url: z.string().url(),
      events: z.array(z.string()).default([
        "conversation.ended",
        "tool.failed",
        "usage.threshold",
      ]),
    })
    .parse(await c.req.json());

  const secret = randomBytes(24).toString("hex");
  const [row] = await db
    .insert(webhooks)
    .values({
      orgId,
      url: body.url,
      secret,
      events: body.events,
    })
    .returning();

  return c.json({ webhook: row }, 201);
});

toolsRoutes.post(
  "/:orgId/webhooks/:webhookId/test",
  requireOrg("webhooks:manage"),
  async (c) => {
    const orgId = c.get("orgId");
    const webhookId = c.req.param("webhookId");
    const [hook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
      .limit(1);
    if (!hook) return c.json({ error: "Webhook not found" }, 404);

    const payload = {
      event: "webhook.test",
      orgId,
      ts: new Date().toISOString(),
      data: { ok: true },
    };
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", hook.secret)
      .update(body)
      .digest("hex");

    const started = Date.now();
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-voiceify-signature": signature,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      return c.json({
        ok: res.ok,
        status: res.status,
        durationMs: Date.now() - started,
      });
    } catch (err) {
      return c.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "Request failed",
          durationMs: Date.now() - started,
        },
        502,
      );
    }
  },
);
