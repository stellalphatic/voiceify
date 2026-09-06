import {
  executePackTool,
  getPack,
  listPacks,
  packIdSchema,
} from "@voiceify/automations";
import {
  agentVersions,
  agents,
  automationInstalls,
  db,
  departments,
  eq,
  faqEntries,
  menuItems,
  and,
  isNull,
  sql,
  tools,
  workflows,
} from "@voiceify/db";
import { buildDashboardSystemPrompt } from "@voiceify/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const automationsRoutes = new Hono<AppEnv>();

// Scoped to this router's own paths. A bare "*" here mounts as "/api/*" and
// forced a session onto every sibling router at /api, including public ones.
automationsRoutes.use("/automations/*", requireSession);
automationsRoutes.use("/orgs/:orgId/automations", requireSession);
automationsRoutes.use("/orgs/:orgId/automations/*", requireSession);
automationsRoutes.use("/orgs/:orgId/workflows/*", requireSession);

automationsRoutes.get("/automations/packs", async (c) => {
  return c.json({ packs: listPacks() });
});

automationsRoutes.get(
  "/orgs/:orgId/automations",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const installs = await db
      .select()
      .from(automationInstalls)
      .where(eq(automationInstalls.orgId, orgId));
    return c.json({
      installs,
      available: listPacks().map((p) => ({
        ...p,
        installed: installs.some((i) => i.packId === p.id),
      })),
    });
  },
);

const workflowGraphSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        type: z.enum(["start", "collect", "tool", "branch", "end", "speak"]),
        label: z.string().min(1).max(240),
        x: z.number().finite(),
        y: z.number().finite(),
        connectorId: z.string().max(120).optional(),
        brand: z.string().max(120).optional(),
      }),
    )
    .max(100),
  edges: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        from: z.string().min(1).max(120),
        to: z.string().min(1).max(120),
      }),
    )
    .max(200),
});

automationsRoutes.get(
  "/orgs/:orgId/workflows/:agentId",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = z.string().uuid().parse(c.req.param("agentId"));
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.orgId, orgId), eq(workflows.agentId, agentId)))
      .limit(1);
    return c.json({ workflow: workflow ?? null });
  },
);

automationsRoutes.put(
  "/orgs/:orgId/workflows/:agentId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const agentId = z.string().uuid().parse(c.req.param("agentId"));
    const body = z
      .object({
        name: z.string().trim().min(1).max(120).default("Conversation flow"),
        status: z.enum(["draft", "active"]).default("draft"),
        graph: workflowGraphSchema,
      })
      .parse(await c.req.json());

    const [agent] = await db
      .select({ id: agents.id })
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

    const [workflow] = await db
      .insert(workflows)
      .values({ orgId, agentId, ...body })
      .onConflictDoUpdate({
        target: [workflows.orgId, workflows.agentId],
        set: {
          name: body.name,
          status: body.status,
          graph: body.graph,
          updatedAt: new Date(),
        },
      })
      .returning();
    return c.json({ workflow });
  },
);

automationsRoutes.post(
  "/orgs/:orgId/automations/install",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const body = z
      .object({ packId: packIdSchema, createAgent: z.boolean().default(true) })
      .parse(await c.req.json());
    const pack = getPack(body.packId);

    const existingInstall = await db
      .select()
      .from(automationInstalls)
      .where(
        and(
          eq(automationInstalls.orgId, orgId),
          eq(automationInstalls.packId, body.packId),
        ),
      )
      .limit(1);

    let install = existingInstall[0];
    if (!install) {
      const [created] = await db
        .insert(automationInstalls)
        .values({
          orgId,
          packId: body.packId,
          config: { version: pack.version },
        })
        .returning();
      install = created;
    }

    const createdToolIds: string[] = [];
    for (const tool of pack.tools) {
      const found = await db
        .select()
        .from(tools)
        .where(and(eq(tools.orgId, orgId), eq(tools.slug, tool.name)))
        .limit(1);
      if (found[0]) {
        const [updated] = await db
          .update(tools)
          .set({
            name: tool.name,
            description: tool.description,
            config: { packId: body.packId, ...tool },
            inputSchema: tool.inputSchema,
            updatedAt: new Date(),
          })
          .where(eq(tools.id, found[0].id))
          .returning();
        createdToolIds.push((updated ?? found[0]).id);
      } else {
        const [inserted] = await db
          .insert(tools)
          .values({
            orgId,
            name: tool.name,
            slug: tool.name,
            description: tool.description,
            type: "pack",
            config: { packId: body.packId, ...tool },
            inputSchema: tool.inputSchema,
          })
          .returning();
        if (inserted) createdToolIds.push(inserted.id);
      }
    }

    // Seed demo data per pack
    if (body.packId === "restaurant") {
      const existing = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.orgId, orgId))
        .limit(1);
      if (!existing.length) {
        await db.insert(menuItems).values([
          {
            orgId,
            name: "Margherita Pizza",
            description: "Tomato, mozzarella, basil",
            priceCents: 1200,
            category: "Mains",
          },
          {
            orgId,
            name: "Caesar Salad",
            description: "Romaine, parmesan, croutons",
            priceCents: 900,
            category: "Starters",
          },
        ]);
      }
    }
    if (body.packId === "receptionist") {
      const deps = await db
        .select()
        .from(departments)
        .where(eq(departments.orgId, orgId))
        .limit(1);
      if (!deps.length) {
        await db.insert(departments).values([
          { orgId, name: "Front Desk", description: "General inquiries" },
          { orgId, name: "Billing", description: "Invoice and payments" },
        ]);
        await db.insert(faqEntries).values([
          {
            orgId,
            question: "What are your hours?",
            answer: "We are open Monday to Friday, 9am to 6pm.",
            category: "hours",
          },
        ]);
      }
    }

    let agent = null;
    if (body.createAgent && pack.agents[0]) {
      const def = pack.agents[0];
      const user = c.get("user");
      const installedAgentId =
        typeof install?.config?.agentId === "string"
          ? install.config.agentId
          : null;
      let existingAgent = installedAgentId
        ? await db
            .select()
            .from(agents)
            .where(
              and(
                eq(agents.id, installedAgentId),
                eq(agents.orgId, orgId),
                isNull(agents.deletedAt),
              ),
            )
            .limit(1)
        : await db
            .select()
            .from(agents)
            .where(
              and(
                eq(agents.orgId, orgId),
                eq(agents.name, def.name),
                isNull(agents.deletedAt),
              ),
            )
            .limit(1);

      if (!existingAgent[0] && !installedAgentId) {
        const linked = await db
          .select({ agent: agents })
          .from(agentVersions)
          .innerJoin(agents, eq(agentVersions.agentId, agents.id))
          .where(
            and(
              eq(agentVersions.orgId, orgId),
              isNull(agents.deletedAt),
              sql`${agentVersions.config}->>'packId' = ${body.packId}`,
            ),
          )
          .limit(1);
        existingAgent = linked.map((row) => row.agent);
      }

      if (existingAgent[0]) {
        agent = existingAgent[0];
      } else {
        const [created] = await db
          .insert(agents)
          .values({
            orgId,
            name: def.name,
            type: def.type,
            language: def.language,
            greeting: def.greeting,
            voiceId: def.voiceId,
            capabilities: Object.fromEntries(def.capabilities.map((c) => [c, true])),
            triggers: Object.fromEntries(def.triggers.map((t) => [t, true])),
            status: "active",
          })
          .returning();
        agent = created;

        if (agent) {
          const systemPrompt = buildDashboardSystemPrompt({
            name: agent.name,
            type: agent.type,
            language: agent.language,
            greeting: agent.greeting ?? undefined,
            capabilities: def.capabilities,
            triggers: def.triggers,
            voiceId: agent.voiceId ?? undefined,
          });

          const [version] = await db
            .insert(agentVersions)
            .values({
              agentId: agent.id,
              orgId,
              version: 1,
              systemPrompt,
              voiceId: agent.voiceId,
              greeting: agent.greeting,
              language: agent.language,
              toolIds: createdToolIds,
              knowledgeDocIds: [],
              config: {
                capabilities: agent.capabilities,
                triggers: agent.triggers,
                guardrails: agent.guardrails ?? {},
                packId: body.packId,
              },
              createdBy: user.id,
            })
            .returning();

          if (version) {
            const [deployed] = await db
              .update(agents)
              .set({
                deployedVersionId: version.id,
                status: "active",
                updatedAt: new Date(),
              })
              .where(eq(agents.id, agent.id))
              .returning();
            agent = deployed ?? agent;
          }
        }
      }
    }

    if (install && agent) {
      const [updatedInstall] = await db
        .update(automationInstalls)
        .set({
          config: {
            ...install.config,
            version: pack.version,
            agentId: agent.id,
          },
        })
        .where(eq(automationInstalls.id, install.id))
        .returning();
      install = updatedInstall ?? install;
    }

    return c.json(
      {
        install: install ?? { orgId, packId: body.packId },
        pack,
        agent,
      },
      201,
    );
  },
);

automationsRoutes.post(
  "/orgs/:orgId/automations/tools/:toolName/run",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const toolName = c.req.param("toolName");
    const body = z
      .object({ args: z.record(z.unknown()).default({}) })
      .parse(await c.req.json().catch(() => ({ args: {} })));
    const result = await executePackTool(orgId, toolName, body.args);
    return c.json({ result }, result.ok ? 200 : 400);
  },
);

automationsRoutes.get(
  "/orgs/:orgId/automations/restaurant/menu",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.orgId, orgId));
    return c.json({ items });
  },
);

automationsRoutes.post(
  "/orgs/:orgId/automations/restaurant/menu",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        priceCents: z.number().int().nonnegative(),
        category: z.string().optional(),
      })
      .parse(await c.req.json());
    const [item] = await db
      .insert(menuItems)
      .values({ orgId, ...body })
      .returning();
    return c.json({ item }, 201);
  },
);
