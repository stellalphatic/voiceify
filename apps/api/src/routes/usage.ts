import {
  and,
  apiKeys,
  creditLedger,
  db,
  desc,
  eq,
  plans,
  subscriptions,
  usageDaily,
  usageEvents,
} from "@voiceify/db";
import { createHash, randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { grantCredits } from "../lib/credits.js";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const usageRoutes = new Hono<AppEnv>();

usageRoutes.use("*", requireSession);

usageRoutes.get("/:orgId/usage", requireOrg("usage:read"), async (c) => {
  const orgId = c.get("orgId");
  const events = await db
    .select()
    .from(usageEvents)
    .where(eq(usageEvents.orgId, orgId))
    .orderBy(desc(usageEvents.createdAt))
    .limit(100);
  const daily = await db
    .select()
    .from(usageDaily)
    .where(eq(usageDaily.orgId, orgId))
    .orderBy(desc(usageDaily.day))
    .limit(30);
  return c.json({
    organization: c.get("organization"),
    events,
    daily,
  });
});

function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  // Ignore placeholder values like sk_test_... from .env.example
  if (!key || key.includes("...")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

function billingMode(): "disabled" | "stripe_test" | "stripe_live" | "manual" {
  if (process.env.STRIPE_ENABLED === "true" && stripeConfigured()) {
    const key = process.env.STRIPE_SECRET_KEY!;
    return key.startsWith("sk_live_") ? "stripe_live" : "stripe_test";
  }
  // Stripe is optional. Platform admin grants credits; orgs can use demo top-up when allowed.
  if (process.env.ALLOW_DEMO_TOPUP === "false") return "disabled";
  return "manual";
}

usageRoutes.get("/:orgId/billing", requireOrg("billing:read"), async (c) => {
  const orgId = c.get("orgId");
  const ledger = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.orgId, orgId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(50);
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(5);
  const allPlans = await db.select().from(plans);
  const mode = billingMode();
  return c.json({
    creditBalanceCents: c.get("organization").creditBalanceCents,
    ledger,
    subscriptions: subs,
    plans: allPlans,
    billing: {
      mode,
      stripeEnabled: mode === "stripe_test" || mode === "stripe_live",
      topupAvailable: mode === "manual" || mode === "stripe_test",
      message:
        mode === "disabled"
          ? "Card payments are not enabled. Ask a platform admin to grant credits."
          : mode === "manual"
            ? "Stripe is not connected. Ask a platform admin to grant credits."
            : "Stripe checkout is available for credit top-ups.",
    },
  });
});

/**
 * Credit top-up. Stripe is optional (STRIPE_ENABLED=true + valid STRIPE_SECRET_KEY).
 * Default path grants demo credits without any payment provider.
 */
usageRoutes.post(
  "/:orgId/billing/topup",
  requireOrg("billing:manage"),
  async (c) => {
    const orgId = c.get("orgId");
    const mode = billingMode();
    if (mode === "disabled") {
      return c.json(
        {
          error:
            "Credit top-up is disabled. Contact a platform admin to assign credits.",
        },
        403,
      );
    }

    const body = z
      .object({
        amountCents: z.number().int().positive().max(1_000_000).default(2500),
      })
      .parse(await c.req.json().catch(() => ({ amountCents: 2500 })));

    if (mode === "stripe_test" || mode === "stripe_live") {
      // Live Checkout / PaymentIntents land when STRIPE_ENABLED=true and SDK is wired.
      // Test mode currently records a ledger grant (no live charge until Stripe is fully integrated).
      const balanceAfter = await grantCredits({
        orgId,
        amountCents: body.amountCents,
        reason: "stripe_test_topup",
        refType: "stripe",
        refId: `test_${Date.now()}`,
      });
      return c.json({
        mode,
        creditBalanceCents: balanceAfter,
        chargedCents: body.amountCents,
      });
    }

    const balanceAfter = await grantCredits({
      orgId,
      amountCents: body.amountCents,
      reason: "manual_topup",
      refType: "manual",
      refId: `manual_${Date.now()}`,
    });
    return c.json({
      mode: "manual",
      creditBalanceCents: balanceAfter,
      chargedCents: body.amountCents,
    });
  },
);

usageRoutes.get("/:orgId/api-keys", requireOrg("api_keys:read"), async (c) => {
  const orgId = c.get("orgId");
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.orgId, orgId));
  return c.json({
    keys: rows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt,
    })),
  });
});

usageRoutes.post("/:orgId/api-keys", requireOrg("api_keys:manage"), async (c) => {
  const orgId = c.get("orgId");
  const body = z
    .object({
      name: z.string().min(1).max(80),
      scopes: z.array(z.string()).default(["voice:respond"]),
    })
    .parse(await c.req.json());

  const raw = `vfk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const keyPrefix = raw.slice(0, 12);

  const [row] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name: body.name,
      keyHash,
      keyPrefix,
      scopes: body.scopes,
    })
    .returning();
  if (!row) return c.json({ error: "Failed to create API key" }, 500);

  return c.json(
    {
      key: {
        id: row.id,
        name: row.name,
        keyPrefix: row.keyPrefix,
        scopes: row.scopes,
        createdAt: row.createdAt,
      },
      secret: raw,
    },
    201,
  );
});

usageRoutes.delete(
  "/:orgId/api-keys/:keyId",
  requireOrg("api_keys:manage"),
  async (c) => {
    const orgId = c.get("orgId");
    const keyId = c.req.param("keyId");
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)));
    return c.json({ ok: true });
  },
);
