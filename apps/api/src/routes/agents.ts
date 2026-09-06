import {
  buildAgentVersionSnapshot,
  parseAgentCreate,
  parseAgentUpdate,
} from "@voiceify/agents";
import {
  agentVersions,
  agents,
  and,
  db,
  desc,
  eq,
  inArray,
  isNull,
  knowledgeDocs,
  sql,
  tools,
} from "@voiceify/db";
import { buildDashboardSystemPrompt } from "@voiceify/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

async function validateAttachments(
  orgId: string,
  toolIds: string[],
  knowledgeDocIds: string[],
): Promise<{ toolIds: string[]; knowledgeDocIds: string[] } | null> {
  const uniqueToolIds = [...new Set(toolIds)];
  const uniqueDocIds = [...new Set(knowledgeDocIds)];
  const [ownedTools, ownedDocs] = await Promise.all([
    uniqueToolIds.length
      ? db
          .select({ id: tools.id })
          .from(tools)
          .where(and(eq(tools.orgId, orgId), inArray(tools.id, uniqueToolIds)))
      : [],
    uniqueDocIds.length
      ? db
          .select({ id: knowledgeDocs.id })
          .from(knowledgeDocs)
          .where(
            and(
              eq(knowledgeDocs.orgId, orgId),
              eq(knowledgeDocs.status, "ready"),
              inArray(knowledgeDocs.id, uniqueDocIds),
            ),
          )
      : [],
  ]);
  if (
    ownedTools.length !== uniqueToolIds.length ||
    ownedDocs.length !== uniqueDocIds.length
  ) {
    return null;
  }
  return { toolIds: uniqueToolIds, knowledgeDocIds: uniqueDocIds };
}

function systemPromptFor(agent: {
  name: string;
  type: string;
  language: string;
  greeting: string | null;
  instructions: string;
  capabilities: unknown;
  triggers: unknown;
  voiceId?: string | null;
}): string {
  return buildDashboardSystemPrompt({
    name: agent.name,
    type: agent.type,
    language: agent.language,
    greeting: agent.greeting ?? undefined,
    instructions: agent.instructions,
    capabilities: asStringList(agent.capabilities),
    triggers: asStringList(agent.triggers),
    voiceId: agent.voiceId ?? undefined,
  });
}

export const agentsRoutes = new Hono<AppEnv>();

agentsRoutes.use("*", requireSession);

agentsRoutes.get("/:orgId/agents", requireOrg("agents:read"), async (c) => {
  const orgId = c.get("orgId");
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.orgId, orgId), isNull(agents.deletedAt)))
    .orderBy(desc(agents.updatedAt));
  if (rows.length === 0) return c.json({ agents: [] });

  const versions = await db
    .select()
    .from(agentVersions)
    .where(inArray(agentVersions.agentId, rows.map((row) => row.id)))
    .orderBy(desc(agentVersions.version));
  const latestByAgent = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    if (!latestByAgent.has(version.agentId)) {
      latestByAgent.set(version.agentId, version);
    }
  }

  return c.json({
    agents: rows.map((agent) => {
      const latest = latestByAgent.get(agent.id);
      return {
        ...agent,
        toolIds: latest?.toolIds ?? [],
        knowledgeDocIds: latest?.knowledgeDocIds ?? [],
      };
    }),
  });
});

agentsRoutes.post("/:orgId/agents", requireOrg("agents:write"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const input = parseAgentCreate(await c.req.json());
  const attachments = await validateAttachments(
    orgId,
    input.toolIds,
    input.knowledgeDocIds,
  );
  if (!attachments) {
    return c.json(
      { error: "Attached tools and ready knowledge documents must belong to this organization" },
      400,
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      orgId,
      name: input.name,
      type: input.type,
      language: input.language,
      greeting: input.greeting,
      instructions: input.instructions,
      voiceId: input.voiceId,
      capabilities: input.capabilities,
      triggers: input.triggers,
      guardrails: input.guardrails,
      status: "draft",
    })
    .returning();
  if (!agent) return c.json({ error: "Failed to create agent" }, 500);

  const systemPrompt = systemPromptFor(agent);

  const snapshot = buildAgentVersionSnapshot({
    name: agent.name,
    type: agent.type,
    language: agent.language,
    greeting: agent.greeting ?? undefined,
    voiceId: agent.voiceId ?? undefined,
    capabilities: agent.capabilities ?? {},
    triggers: agent.triggers ?? {},
    guardrails: agent.guardrails ?? {},
  });

  const [version] = await db
    .insert(agentVersions)
    .values({
      agentId: agent.id,
      orgId,
      version: snapshot.version,
      systemPrompt,
      voiceId: agent.voiceId,
      greeting: agent.greeting,
      language: agent.language,
      toolIds: attachments.toolIds,
      knowledgeDocIds: attachments.knowledgeDocIds,
      config: {
        instructions: agent.instructions,
        capabilities: agent.capabilities,
        triggers: agent.triggers,
        guardrails: agent.guardrails,
      },
      createdBy: user.id,
    })
    .returning();

  return c.json({ agent, version }, 201);
});

agentsRoutes.get(
  "/:orgId/agents/:agentId",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
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

    const versions = await db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agentId))
      .orderBy(desc(agentVersions.version));

    return c.json({ agent, versions });
  },
);

agentsRoutes.patch(
  "/:orgId/agents/:agentId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
    const user = c.get("user");
    const input = parseAgentUpdate(await c.req.json());
    const { toolIds, knowledgeDocIds, ...agentInput } = input;
    const attachments =
      toolIds !== undefined || knowledgeDocIds !== undefined
        ? await validateAttachments(orgId, toolIds ?? [], knowledgeDocIds ?? [])
        : null;
    if ((toolIds !== undefined || knowledgeDocIds !== undefined) && !attachments) {
      return c.json(
        { error: "Attached tools and ready knowledge documents must belong to this organization" },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(agents)
      .where(
        and(eq(agents.id, agentId), eq(agents.orgId, orgId), isNull(agents.deletedAt)),
      )
      .limit(1);
    if (!existing) return c.json({ error: "Agent not found" }, 404);

    const result = await db.transaction(async (tx) => {
      // Two UI saves can arrive together. Serializing per agent prevents both
      // requests from choosing the same next version number.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${agentId}))`);

      const [agent] = await tx
        .update(agents)
        .set({ ...agentInput, updatedAt: new Date() })
        .where(
          and(
            eq(agents.id, agentId),
            eq(agents.orgId, orgId),
            isNull(agents.deletedAt),
          ),
        )
        .returning();
      if (!agent) throw new Error("Agent disappeared during update");

      const [latest] = await tx
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, agentId))
        .orderBy(desc(agentVersions.version))
        .limit(1);

      const snapshot = buildAgentVersionSnapshot(
        {
          name: agent.name,
          type: agent.type,
          language: agent.language,
          greeting: agent.greeting ?? undefined,
          voiceId: agent.voiceId ?? undefined,
          capabilities: agent.capabilities ?? {},
          triggers: agent.triggers ?? {},
          guardrails: agent.guardrails ?? {},
        },
        latest?.version,
      );

      const [version] = await tx
        .insert(agentVersions)
        .values({
          agentId,
          orgId,
          version: snapshot.version,
          systemPrompt: systemPromptFor(agent),
          voiceId: agent.voiceId,
          greeting: agent.greeting,
          language: agent.language,
          toolIds:
            toolIds !== undefined
              ? (attachments?.toolIds ?? [])
              : (latest?.toolIds ?? []),
          knowledgeDocIds:
            knowledgeDocIds !== undefined
              ? (attachments?.knowledgeDocIds ?? [])
              : (latest?.knowledgeDocIds ?? []),
          config: {
            instructions: agent.instructions,
            capabilities: agent.capabilities,
            triggers: agent.triggers,
            guardrails: agent.guardrails,
          },
          createdBy: user.id,
        })
        .returning();
      if (!version) throw new Error("Failed to create agent version");

      // Active agents immediately advance to the newly saved immutable version.
      // Draft agents still require the explicit Deploy action.
      let savedAgent = agent;
      if (existing.deployedVersionId && agent.status === "active") {
        const [redeployed] = await tx
          .update(agents)
          .set({ deployedVersionId: version.id, updatedAt: new Date() })
          .where(eq(agents.id, agentId))
          .returning();
        if (redeployed) savedAgent = redeployed;
      }

      return { agent: savedAgent, version };
    });

    return c.json(result);
  },
);

agentsRoutes.post(
  "/:orgId/agents/:agentId/deploy",
  requireOrg("agents:deploy"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
    const body = z
      .object({ versionId: z.string().uuid().optional() })
      .parse(await c.req.json().catch(() => ({})));

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)))
      .limit(1);
    if (!agent) return c.json({ error: "Agent not found" }, 404);

    let versionId = body.versionId;
    const [selectedVersion] = await db
        .select()
        .from(agentVersions)
        .where(
          and(
            eq(agentVersions.agentId, agentId),
            eq(agentVersions.orgId, orgId),
            ...(versionId ? [eq(agentVersions.id, versionId)] : []),
          ),
        )
        .orderBy(desc(agentVersions.version))
        .limit(1);
    versionId = selectedVersion?.id;
    if (!versionId) return c.json({ error: "No version to deploy" }, 400);

    const [updated] = await db
      .update(agents)
      .set({
        deployedVersionId: versionId,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning();

    return c.json({ agent: updated });
  },
);

agentsRoutes.delete(
  "/:orgId/agents/:agentId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
    await db
      .update(agents)
      .set({ deletedAt: new Date(), status: "paused", updatedAt: new Date() })
      .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)));
    return c.json({ ok: true });
  },
);
