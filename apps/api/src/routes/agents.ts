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
  isNull,
} from "@voiceify/db";
import { buildDashboardSystemPrompt } from "@voiceify/shared";
import { Hono } from "hono";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

function systemPromptFor(agent: {
  name: string;
  type: string;
  language: string;
  greeting: string | null;
  capabilities: unknown;
  triggers: unknown;
  voiceId?: string | null;
}): string {
  return buildDashboardSystemPrompt({
    name: agent.name,
    type: agent.type,
    language: agent.language,
    greeting: agent.greeting ?? undefined,
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
  return c.json({ agents: rows });
});

agentsRoutes.post("/:orgId/agents", requireOrg("agents:write"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const input = parseAgentCreate(await c.req.json());

  const [agent] = await db
    .insert(agents)
    .values({
      orgId,
      name: input.name,
      type: input.type,
      language: input.language,
      greeting: input.greeting,
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
      config: {
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

    const [existing] = await db
      .select()
      .from(agents)
      .where(
        and(eq(agents.id, agentId), eq(agents.orgId, orgId), isNull(agents.deletedAt)),
      )
      .limit(1);
    if (!existing) return c.json({ error: "Agent not found" }, 404);

    const [agent] = await db
      .update(agents)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning();
    if (!agent) return c.json({ error: "Failed to update agent" }, 500);

    const [latest] = await db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agentId))
      .orderBy(desc(agentVersions.version))
      .limit(1);

    const systemPrompt = systemPromptFor(agent);

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

    const [version] = await db
      .insert(agentVersions)
      .values({
        agentId,
        orgId,
        version: snapshot.version,
        systemPrompt,
        voiceId: agent.voiceId,
        greeting: agent.greeting,
        language: agent.language,
        toolIds: latest?.toolIds ?? [],
        knowledgeDocIds: latest?.knowledgeDocIds ?? [],
        config: {
          capabilities: agent.capabilities,
          triggers: agent.triggers,
          guardrails: agent.guardrails,
        },
        createdBy: user.id,
      })
      .returning();

    // Runtime reads the deployed version first, so an already-live agent would
    // keep serving its old voice/greeting until this pointer moves forward.
    let deployed = agent;
    if (version && existing.deployedVersionId) {
      const [redeployed] = await db
        .update(agents)
        .set({ deployedVersionId: version.id, updatedAt: new Date() })
        .where(eq(agents.id, agentId))
        .returning();
      if (redeployed) deployed = redeployed;
    }

    return c.json({ agent: deployed, version });
  },
);

agentsRoutes.post(
  "/:orgId/agents/:agentId/deploy",
  requireOrg("agents:deploy"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = c.req.param("agentId");
    const body = (await c.req.json().catch(() => ({}))) as {
      versionId?: string;
    };

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)))
      .limit(1);
    if (!agent) return c.json({ error: "Agent not found" }, 404);

    let versionId = body.versionId;
    if (!versionId) {
      const [latest] = await db
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, agentId))
        .orderBy(desc(agentVersions.version))
        .limit(1);
      versionId = latest?.id;
    }
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
