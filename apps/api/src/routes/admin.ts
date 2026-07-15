import {
  agents,
  conversations,
  creditLedger,
  db,
  desc,
  eq,
  ilike,
  or,
  orgMembers,
  organizations,
  sql,
  usageDaily,
  usageEvents,
  user,
  type UserStatus,
} from "@voiceify/db";
import {
  getResendConfig,
  sendTransactionalEmail,
  setUserStatus,
} from "@voiceify/auth";
import { Hono } from "hono";
import { z } from "zod";
import { grantCredits } from "../lib/credits.js";
import type { AppEnv } from "../lib/types.js";
import { requireSession } from "../middleware/session.js";
import { requirePlatformAdmin } from "../middleware/super-admin.js";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", requireSession, requirePlatformAdmin);

adminRoutes.get("/overview", async (c) => {
  const [counts] = await db
    .select({
      users: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${user.status} = 'pending')::int`,
      approved: sql<number>`count(*) filter (where ${user.status} = 'approved')::int`,
      suspended: sql<number>`count(*) filter (where ${user.status} = 'suspended')::int`,
    })
    .from(user);

  const [orgStats] = await db
    .select({
      orgs: sql<number>`count(*)::int`,
      credits: sql<number>`coalesce(sum(${organizations.creditBalanceCents}),0)::int`,
      suspendedOrgs: sql<number>`count(*) filter (where ${organizations.status} = 'suspended')::int`,
    })
    .from(organizations);

  const [usage] = await db
    .select({
      events: sql<number>`count(*)::int`,
      sttMs: sql<number>`coalesce(sum(case when ${usageEvents.kind} = 'stt_ms' then ${usageEvents.quantity} else 0 end),0)::int`,
      llmTokens: sql<number>`coalesce(sum(case when ${usageEvents.kind} = 'llm_tokens' then ${usageEvents.quantity} else 0 end),0)::int`,
      ttsChars: sql<number>`coalesce(sum(case when ${usageEvents.kind} = 'tts_chars' then ${usageEvents.quantity} else 0 end),0)::int`,
    })
    .from(usageEvents);

  const [conv] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversations);

  return c.json({
    users: counts,
    organizations: orgStats,
    usage,
    conversations: conv?.total ?? 0,
  });
});

adminRoutes.get("/users", async (c) => {
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim();

  let rows = await db.select().from(user).orderBy(desc(user.createdAt)).limit(200);

  if (status && status !== "all") {
    rows = rows.filter((r) => r.status === status);
  }
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(lower) ||
        r.name.toLowerCase().includes(lower),
    );
  }

  const memberships = await db
    .select({
      userId: orgMembers.userId,
      orgId: orgMembers.orgId,
      role: orgMembers.role,
      orgName: organizations.name,
      credits: organizations.creditBalanceCents,
      orgStatus: organizations.status,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id));

  return c.json({
    users: rows.map((u) => ({
      ...u,
      orgs: memberships.filter((m) => m.userId === u.id),
    })),
  });
});

adminRoutes.patch("/users/:userId/status", async (c) => {
  const userId = c.req.param("userId");
  const body = z
    .object({
      status: z.enum(["pending", "approved", "rejected", "suspended"]),
    })
    .parse(await c.req.json());

  const admin = c.get("user");
  if (admin.id === userId && body.status !== "approved") {
    return c.json({ error: "Cannot demote or suspend your own admin account" }, 400);
  }

  const updated = await setUserStatus(userId, body.status as UserStatus);
  if (!updated) return c.json({ error: "User not found" }, 404);
  return c.json({ user: updated });
});

adminRoutes.get("/organizations", async (c) => {
  const q = c.req.query("q")?.trim();
  const rows = q
    ? await db
        .select()
        .from(organizations)
        .where(
          or(
            ilike(organizations.name, `%${q}%`),
            ilike(organizations.slug, `%${q}%`),
          ),
        )
        .orderBy(desc(organizations.createdAt))
        .limit(200)
    : await db
        .select()
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(200);

  const agentCounts = await db
    .select({
      orgId: agents.orgId,
      count: sql<number>`count(*)::int`,
    })
    .from(agents)
    .groupBy(agents.orgId);

  const countMap = new Map(agentCounts.map((a) => [a.orgId, a.count]));

  return c.json({
    organizations: rows.map((o) => ({
      ...o,
      agentCount: countMap.get(o.id) ?? 0,
    })),
  });
});

adminRoutes.patch("/organizations/:orgId/status", async (c) => {
  const orgId = c.req.param("orgId");
  const body = z
    .object({ status: z.enum(["active", "suspended"]) })
    .parse(await c.req.json());

  const [updated] = await db
    .update(organizations)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();

  if (!updated) return c.json({ error: "Organization not found" }, 404);
  return c.json({ organization: updated });
});

adminRoutes.post("/organizations/:orgId/credits", async (c) => {
  const orgId = c.req.param("orgId");
  const body = z
    .object({
      amountCents: z.number().int().refine((n) => n !== 0, "amountCents cannot be 0"),
      reason: z.string().min(1).max(200).default("admin_adjustment"),
    })
    .parse(await c.req.json());

  const admin = c.get("user");

  if (body.amountCents > 0) {
    const balanceAfter = await grantCredits({
      orgId,
      amountCents: body.amountCents,
      reason: body.reason,
      refType: "admin",
      refId: admin.id,
    });
    return c.json({ creditBalanceCents: balanceAfter, deltaCents: body.amountCents });
  }

  // Negative: debit
  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!org) throw new Error("Organization not found");

    const next = Math.max(0, org.creditBalanceCents + body.amountCents);
    await tx
      .update(organizations)
      .set({ creditBalanceCents: next, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));
    await tx.insert(creditLedger).values({
      orgId,
      deltaCents: body.amountCents,
      reason: body.reason,
      refType: "admin",
      refId: admin.id,
      balanceAfter: next,
    });
    return next;
  });

  return c.json({ creditBalanceCents: result, deltaCents: body.amountCents });
});

adminRoutes.get("/usage", async (c) => {
  const orgId = c.req.query("orgId");
  const events = orgId
    ? await db
        .select()
        .from(usageEvents)
        .where(eq(usageEvents.orgId, orgId))
        .orderBy(desc(usageEvents.createdAt))
        .limit(100)
    : await db
        .select()
        .from(usageEvents)
        .orderBy(desc(usageEvents.createdAt))
        .limit(100);

  const daily = orgId
    ? await db
        .select()
        .from(usageDaily)
        .where(eq(usageDaily.orgId, orgId))
        .orderBy(desc(usageDaily.day))
        .limit(30)
    : await db
        .select()
        .from(usageDaily)
        .orderBy(desc(usageDaily.day))
        .limit(30);

  const ledger = orgId
    ? await db
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.orgId, orgId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(50)
    : await db
        .select()
        .from(creditLedger)
        .orderBy(desc(creditLedger.createdAt))
        .limit(50);

  return c.json({ events, daily, ledger });
});

adminRoutes.get("/me", async (c) => {
  return c.json({ user: c.get("user") });
});

adminRoutes.get("/email-status", async (c) => {
  const cfg = getResendConfig();
  return c.json({
    configured: cfg.configured,
    from: cfg.configured ? cfg.from : null,
    hint: cfg.configured
      ? "Resend key is loaded in the API container."
      : "Set RESEND_API_KEY (and RESEND_FROM_EMAIL) in the host .env, then recreate the api container.",
  });
});

adminRoutes.post("/test-email", async (c) => {
  const body = z
    .object({
      to: z.string().email().optional(),
    })
    .parse(await c.req.json().catch(() => ({})));
  const to = body.to ?? c.get("user").email;
  const result = await sendTransactionalEmail({
    to,
    subject: "Voiceify test email",
    text: "If you received this, Resend is configured correctly for Voiceify.",
    html: "<p>If you received this, Resend is configured correctly for Voiceify.</p>",
  });
  if (!result.ok) {
    return c.json({ ok: false, error: result.error }, 502);
  }
  return c.json({ ok: true, id: result.id ?? null, to });
});
