import { executePackTool } from "@voiceify/automations";
import {
  agentVersions,
  agents,
  and,
  conversations,
  db,
  eq,
  isNull,
  messages,
  toolInvocations,
  tools,
} from "@voiceify/db";
import { executeHttpTool } from "@voiceify/tools";
import { resolveBasePersonaId } from "@voiceify/shared";
import {
  createScribeRealtimeToken,
  handleVoiceRespond,
  handleVoiceTranscribe,
  handleVoiceVoices,
  handleVoiceWarmup,
  runVoicePipeline,
} from "@voiceify/voice";
import { Hono } from "hono";
import { z } from "zod";
import { assertOrgHasCredits, recordUsageAndDebit } from "../lib/credits.js";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requireSession } from "../middleware/session.js";

export const voiceRoutes = new Hono<AppEnv>();

voiceRoutes.use("*", rateLimit({ prefix: "voice", limit: 60 }));

/** Public health-style voice metadata (legacy-compatible). */
voiceRoutes.get("/voices", async () => {
  return handleVoiceVoices();
});

voiceRoutes.post("/warmup", async (c) => {
  const res = await handleVoiceWarmup(c.req.raw);
  return res;
});

voiceRoutes.post("/transcribe/token", async (c) => {
  try {
    const token = await createScribeRealtimeToken();
    return c.json(token);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Token failed" },
      500,
    );
  }
});

voiceRoutes.post("/transcribe", async (c) => {
  const res = await handleVoiceTranscribe(c.req.raw);
  return res;
});

/** Legacy NDJSON voice respond (demo / unauthenticated sandbox). */
voiceRoutes.post("/respond", async (c) => {
  const res = await handleVoiceRespond(c.req.raw);
  return res;
});

const turnSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
  conversationId: z.string().uuid().optional(),
  channel: z.enum(["sandbox", "embed", "api"]).default("sandbox"),
  ttsOnly: z.boolean().optional(),
});

/**
 * Authenticated org+agent voice turn with metering, persistence, and pack tools.
 */
voiceRoutes.post(
  "/:orgId/agents/:agentId/turn",
  requireSession,
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
    const body = turnSchema.parse(await c.req.json());

    const credits = await assertOrgHasCredits(orgId);
    if (!credits.allowed) {
      return c.json({ error: "Insufficient credits", ...credits }, 402);
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, agentId),
          eq(agents.orgId, orgId),
          isNull(agents.deletedAt),
        ),
      )
      .limit(1);
    if (!agent) return c.json({ error: "Agent not found" }, 404);

    let version = null as typeof agentVersions.$inferSelect | null;
    if (agent.deployedVersionId) {
      const [v] = await db
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.id, agent.deployedVersionId))
        .limit(1);
      version = v ?? null;
    }

    let conversationId = body.conversationId;
    if (!conversationId) {
      const [conv] = await db
        .insert(conversations)
        .values({
          orgId,
          agentId,
          agentVersionId: version?.id,
          channel: body.channel,
          status: "active",
        })
        .returning();
      if (!conv) return c.json({ error: "Failed to start conversation" }, 500);
      conversationId = conv.id;
    }

    await db.insert(messages).values({
      conversationId,
      orgId,
      role: "user",
      content: body.message,
    });

    // Attach tool names for LLM context via greeting/prompt enrichment
    const orgTools = await db
      .select()
      .from(tools)
      .where(eq(tools.orgId, orgId));

    const toolHint =
      orgTools.length > 0
        ? `\nAvailable tools: ${orgTools.map((t) => t.slug).join(", ")}. If the user wants to book/order/route, confirm details then call the matching tool via TOOL_CALL JSON.`
        : "";

    const agentConfig = {
      name: agent.name,
      type: agent.type,
      language: version?.language ?? agent.language,
      greeting: version?.greeting ?? agent.greeting ?? undefined,
      voiceId: version?.voiceId ?? agent.voiceId ?? undefined,
      capabilities: Object.keys(agent.capabilities ?? {}),
      triggers: Object.keys(agent.triggers ?? {}),
    };
    const personaId = resolveBasePersonaId(agent.type);

    // Detect simple tool intents for pack tools (deterministic FYP path)
    const lower = body.message.toLowerCase();
    let toolResult: { name: string; result: unknown } | null = null;
    const packTool = orgTools.find((t) => t.type === "pack");
    if (packTool && /(book|reserv|appointment|order|intake|faq)/i.test(lower)) {
      const name =
        orgTools.find((t) => lower.includes(t.slug.replace(/_/g, " ")))?.slug ||
        orgTools.find((t) =>
          ["create_reservation", "book_appointment", "create_intake"].includes(
            t.slug,
          ),
        )?.slug ||
        packTool.slug;

      const args: Record<string, unknown> = {
        guestName: "Guest",
        customerName: "Guest",
        partySize: 2,
        body: body.message,
        message: body.message,
        query: body.message,
        datetime: new Date().toISOString(),
      };
      const started = Date.now();
      let result;
      if (
        orgTools.find((t) => t.slug === name)?.type === "http"
      ) {
        const httpTool = orgTools.find((t) => t.slug === name)!;
        result = await executeHttpTool(
          { name, description: httpTool.description, ...httpTool.config },
          args,
        );
      } else {
        result = await executePackTool(orgId, name, args);
      }

      await db.insert(toolInvocations).values({
        conversationId,
        orgId,
        toolId: orgTools.find((t) => t.slug === name)?.id,
        name,
        args,
        result: result as Record<string, unknown>,
        status: result.ok ? "success" : "error",
        durationMs: Date.now() - started,
      });
      toolResult = { name, result };
    }

    const enrichMessage = toolResult
      ? `${body.message}\n\n[System: tool ${toolResult.name} returned ${JSON.stringify(toolResult.result)}. Summarize confirmation for the caller.]`
      : body.message + toolHint;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let assistantText = "";
        let ttsChars = 0;
        try {
          for await (const event of runVoicePipeline(
            personaId,
            enrichMessage,
            body.history,
            {
              ttsOnly: body.ttsOnly,
              customAgent: agentConfig,
            },
          )) {
            if (event.type === "text" && "text" in event) {
              assistantText = String(event.text ?? "");
            }
            if (event.type === "audio" && "data" in event) {
              ttsChars += 40;
            }
            if (event.type === "error") {
              controller.enqueue(
                encoder.encode(`${JSON.stringify(event)}\n`),
              );
              continue;
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }

          if (assistantText) {
            await db.insert(messages).values({
              conversationId: conversationId!,
              orgId,
              role: "assistant",
              content: assistantText,
            });
          }

          await recordUsageAndDebit({
            orgId,
            conversationId,
            llmTokens: Math.ceil((enrichMessage.length + assistantText.length) / 4),
            ttsChars: Math.max(ttsChars, assistantText.length),
            toolCalls: toolResult ? 1 : 0,
          });
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "error",
                error: err instanceof Error ? err.message : "Voice failed",
              })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson",
        "x-conversation-id": conversationId,
        "x-credits-soft-warn": credits.softWarn ? "1" : "0",
      },
    });
  },
);
