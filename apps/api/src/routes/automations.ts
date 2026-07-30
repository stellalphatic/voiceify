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
  tools,
} from "@voiceify/db";
import { buildDashboardSystemPrompt } from "@voiceify/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const automationsRoutes = new Hono<AppEnv>();

automationsRoutes.use("*", requireSession);

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
        createdToolIds.push(found[0].id);
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
            inputSchema: {},
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
      const existingAgent = await db
        .select()
        .from(agents)
        .where(and(eq(agents.orgId, orgId), eq(agents.name, def.name)))
        .limit(1);

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
