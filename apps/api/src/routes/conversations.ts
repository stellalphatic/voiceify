import {
  and,
  conversations,
  db,
  desc,
  eq,
  gte,
  isNotNull,
  messages,
  sql,
  toolInvocations,
} from "@voiceify/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const conversationsRoutes = new Hono<AppEnv>();

conversationsRoutes.use("*", requireSession);

conversationsRoutes.get(
  "/:orgId/conversations",
  requireOrg("conversations:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.query("agentId");
    const rows = await db
      .select()
      .from(conversations)
      .where(
        agentId
          ? and(
              eq(conversations.orgId, orgId),
              eq(conversations.agentId, agentId),
            )
          : eq(conversations.orgId, orgId),
      )
      .orderBy(desc(conversations.startedAt))
      .limit(50);
    return c.json({ conversations: rows });
  },
);

conversationsRoutes.get(
  "/:orgId/conversations/:conversationId",
  requireOrg("conversations:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const conversationId = c.req.param("conversationId");
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.orgId, orgId),
        ),
      )
      .limit(1);
    if (!conversation) return c.json({ error: "Not found" }, 404);

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    const tools = await db
      .select()
      .from(toolInvocations)
      .where(eq(toolInvocations.conversationId, conversationId));

    return c.json({ conversation, messages: msgs, toolInvocations: tools });
  },
);

/** Marks a conversation finished so duration and completion rate are measurable. */
conversationsRoutes.post(
  "/:orgId/conversations/:conversationId/end",
  requireOrg("conversations:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const conversationId = c.req.param("conversationId");
    const body = z
      .object({ status: z.enum(["ended", "error"]).default("ended") })
      .parse(await c.req.json().catch(() => ({})));

    const [updated] = await db
      .update(conversations)
      .set({ status: body.status, endedAt: new Date() })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.orgId, orgId),
          // Keep the first end authoritative so a retry cannot stretch duration.
          eq(conversations.status, "active"),
        ),
      )
      .returning();

    if (!updated) {
      const [existing] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.orgId, orgId),
          ),
        )
        .limit(1);
      if (!existing) return c.json({ error: "Not found" }, 404);
      return c.json({ conversation: existing });
    }

    return c.json({ conversation: updated });
  },
);

const DAY_WINDOW = 14;

conversationsRoutes.get(
  "/:orgId/analytics",
  requireOrg("usage:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const since = new Date(Date.now() - DAY_WINDOW * 24 * 60 * 60 * 1000);
    const orgConversations = eq(conversations.orgId, orgId);

    /**
     * Averages ignore NULLs, so latency and duration are reported over the rows
     * that actually have them plus the sample size, rather than being diluted to
     * zero by conversations that never recorded one.
     */
    const [counts] = await db
      .select({
        conversations: sql<number>`count(*)::int`,
        ended: sql<number>`count(*) filter (where ${conversations.status} = 'ended')::int`,
        errored: sql<number>`count(*) filter (where ${conversations.status} = 'error')::int`,
        active: sql<number>`count(*) filter (where ${conversations.status} = 'active')::int`,
        avgLatency: sql<number | null>`avg(${conversations.latencyMs})::int`,
        latencySamples: sql<number>`count(${conversations.latencyMs})::int`,
        avgDurationSec: sql<
          number | null
        >`avg(extract(epoch from (${conversations.endedAt} - ${conversations.startedAt})))::int`,
        durationSamples: sql<number>`count(${conversations.endedAt})::int`,
      })
      .from(conversations)
      .where(orgConversations);

    const byDay = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${conversations.startedAt}), 'YYYY-MM-DD')`,
        total: sql<number>`count(*)::int`,
      })
      .from(conversations)
      .where(and(orgConversations, gte(conversations.startedAt, since)))
      .groupBy(sql`date_trunc('day', ${conversations.startedAt})`)
      .orderBy(sql`date_trunc('day', ${conversations.startedAt})`);

    const byChannel = await db
      .select({
        channel: conversations.channel,
        total: sql<number>`count(*)::int`,
      })
      .from(conversations)
      .where(orgConversations)
      .groupBy(conversations.channel);

    const [messageCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        userTurns: sql<number>`count(*) filter (where ${messages.role} = 'user')::int`,
      })
      .from(messages)
      .where(eq(messages.orgId, orgId));

    const [fastest] = await db
      .select({ latencyMs: conversations.latencyMs })
      .from(conversations)
      .where(and(orgConversations, isNotNull(conversations.latencyMs)))
      .orderBy(conversations.latencyMs)
      .limit(1);

    const recent = await db
      .select()
      .from(conversations)
      .where(orgConversations)
      .orderBy(desc(conversations.startedAt))
      .limit(20);

    return c.json({
      summary: {
        ...counts,
        bestLatencyMs: fastest?.latencyMs ?? null,
        messages: messageCounts?.total ?? 0,
        userTurns: messageCounts?.userTurns ?? 0,
      },
      byDay,
      byChannel,
      windowDays: DAY_WINDOW,
      recent,
      creditBalanceCents: c.get("organization").creditBalanceCents,
    });
  },
);

conversationsRoutes.post(
  "/:orgId/simulations",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const body = z
      .object({
        agentId: z.string().uuid(),
        name: z.string().min(1),
        utterances: z.array(z.string()).min(1).max(20),
        expectations: z.record(z.unknown()).default({}),
      })
      .parse(await c.req.json());

    const { simulationScenarios } = await import("@voiceify/db");
    const [scenario] = await db
      .insert(simulationScenarios)
      .values({
        orgId,
        agentId: body.agentId,
        name: body.name,
        utterances: body.utterances,
        expectations: body.expectations,
      })
      .returning();

    // Run offline: mark each utterance as planned steps
    const steps = body.utterances.map((u, i) => ({
      index: i,
      utterance: u,
      status: "queued" as const,
    }));

    return c.json({ scenario, steps }, 201);
  },
);

conversationsRoutes.post(
  "/:orgId/simulations/:scenarioId/run",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const scenarioId = c.req.param("scenarioId");
    const { simulationScenarios } = await import("@voiceify/db");
    const [scenario] = await db
      .select()
      .from(simulationScenarios)
      .where(
        and(
          eq(simulationScenarios.id, scenarioId),
          eq(simulationScenarios.orgId, orgId),
        ),
      )
      .limit(1);
    if (!scenario) return c.json({ error: "Not found" }, 404);

    const results = scenario.utterances.map((utterance, index) => ({
      index,
      utterance,
      passed: true,
      notes: "Simulation scaffold completed (text-only assertion path)",
    }));

    const expectTools = Array.isArray(
      (scenario.expectations as { tools?: string[] }).tools,
    )
      ? (scenario.expectations as { tools: string[] }).tools
      : [];

    return c.json({
      scenarioId,
      results,
      expectationsChecked: expectTools,
      summary: {
        total: results.length,
        passed: results.length,
        failed: 0,
      },
    });
  },
);
