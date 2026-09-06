import {
  agents,
  agentVersions,
  and,
  conversations,
  db,
  embedConfigs,
  embedSessions,
  eq,
  gt,
  isNull,
  messages,
} from "@voiceify/db";
import { resolveBasePersonaId } from "@voiceify/shared";
import { runVoicePipeline } from "@voiceify/voice";
import { createHash, randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireSession } from "../middleware/session.js";
import { assertOrgHasCredits, recordUsageAndDebit } from "../lib/credits.js";

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

embedRoutes.post(
  "/public/session/turn",
  rateLimit({ prefix: "embed-turn", limit: 60 }),
  async (c) => {
    const body = z
      .object({
        sessionToken: z.string().startsWith("emb_").min(68),
        origin: z.string().optional(),
        message: z.string().trim().min(1).max(4000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(4000),
            }),
          )
          .max(20)
          .default([]),
        conversationId: z.string().uuid().optional(),
        textOnly: z.boolean().default(false),
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

    const credits = await assertOrgHasCredits(session.orgId);
    if (!credits.allowed) return c.json({ error: "Agent is temporarily unavailable" }, 402);

    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, session.agentId),
          eq(agents.orgId, session.orgId),
          eq(agents.status, "active"),
          isNull(agents.deletedAt),
        ),
      )
      .limit(1);
    if (!agent) return c.json({ error: "Agent not deployed" }, 409);

    const [version] = agent.deployedVersionId
      ? await db
          .select()
          .from(agentVersions)
          .where(
            and(
              eq(agentVersions.id, agent.deployedVersionId),
              eq(agentVersions.agentId, agent.id),
              eq(agentVersions.orgId, session.orgId),
            ),
          )
          .limit(1)
      : [];
    if (!version) return c.json({ error: "Agent has no deployed version" }, 409);

    let conversationId = body.conversationId;
    if (conversationId) {
      const [existingConversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.orgId, session.orgId),
            eq(conversations.agentId, agent.id),
            eq(conversations.channel, "embed"),
          ),
        )
        .limit(1);
      if (!existingConversation) {
        return c.json({ error: "Conversation not found" }, 404);
      }
    } else {
      const [conversation] = await db
        .insert(conversations)
        .values({
          orgId: session.orgId,
          agentId: agent.id,
          agentVersionId: version.id,
          channel: "embed",
          status: "active",
        })
        .returning();
      if (!conversation) return c.json({ error: "Could not start conversation" }, 500);
      conversationId = conversation.id;
    }

    await db.insert(messages).values({
      conversationId,
      orgId: session.orgId,
      role: "user",
      content: body.message,
    });

    const versionConfig = version.config as Record<string, unknown>;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let assistantText = "";
        let ttsChars = 0;
        try {
          for await (const event of runVoicePipeline(
            resolveBasePersonaId(agent.type),
            body.message,
            body.history,
            {
              skipTts: body.textOnly,
              customAgent: {
                name: agent.name,
                type: agent.type,
                language: version.language,
                greeting: version.greeting ?? undefined,
                voiceId: version.voiceId ?? agent.voiceId ?? undefined,
                systemPrompt: version.systemPrompt,
                instructions:
                  typeof versionConfig.instructions === "string"
                    ? versionConfig.instructions
                    : agent.instructions,
              },
            },
          )) {
            if (event.type === "text") assistantText = event.text;
            if (event.type === "audio") ttsChars += 40;
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }
          if (assistantText) {
            await db.insert(messages).values({
              conversationId: conversationId!,
              orgId: session.orgId,
              role: "assistant",
              content: assistantText,
            });
          }
          await recordUsageAndDebit({
            orgId: session.orgId,
            conversationId,
            llmTokens: Math.ceil((body.message.length + assistantText.length) / 4),
            ttsChars: Math.max(ttsChars, assistantText.length),
            toolCalls: 0,
          });
        } catch {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({ type: "error", message: "Agent turn failed" })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    await db
      .update(embedSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(embedSessions.id, session.id));

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson",
        "x-conversation-id": conversationId,
      },
    });
  },
);
