import { createOrgWithOwner, listUserOrgs } from "@voiceify/auth";
import { and, db, eq, orgMembers, organizations } from "@voiceify/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).optional(),
});

export const orgsRoutes = new Hono<AppEnv>();

orgsRoutes.use("*", requireSession);

orgsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const rows = await listUserOrgs(user.id);
  return c.json({
    organizations: rows.map(({ organization, member }) => ({
      ...organization,
      role: member.role,
    })),
  });
});

orgsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body = createSchema.parse(await c.req.json());
  const { organization, member } = await createOrgWithOwner({
    name: body.name,
    slug: body.slug,
    ownerUserId: user.id,
  });

  // Seed free trial credits for FYP demos
  await db
    .update(organizations)
    .set({ creditBalanceCents: 5000, updatedAt: new Date() })
    .where(eq(organizations.id, organization.id));

  return c.json(
    { organization: { ...organization, creditBalanceCents: 5000 }, role: member.role },
    201,
  );
});

orgsRoutes.get("/:orgId", requireOrg("org:read"), async (c) => {
  return c.json({
    organization: c.get("organization"),
    role: c.get("membership").role,
  });
});

orgsRoutes.get("/:orgId/members", requireOrg("members:read"), async (c) => {
  const orgId = c.get("orgId");
  const members = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.orgId, orgId));
  return c.json({ members });
});

orgsRoutes.patch("/:orgId", requireOrg("org:update"), async (c) => {
  const orgId = c.get("orgId");
  const body = z
    .object({ name: z.string().min(1).max(120).optional() })
    .parse(await c.req.json());

  const [updated] = await db
    .update(organizations)
    .set({
      ...(body.name ? { name: body.name } : {}),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId))
    .returning();

  return c.json({ organization: updated });
});

orgsRoutes.delete(
  "/:orgId/members/:memberId",
  requireOrg("members:remove"),
  async (c) => {
    const orgId = c.get("orgId");
    const memberId = c.req.param("memberId");
    await db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.id, memberId)));
    return c.json({ ok: true });
  },
);
