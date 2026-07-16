import {
  and,
  apiKeys,
  db,
  eq,
  isNull,
  orgMembers,
  organizations,
} from "@voiceify/db";
import { createHash } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { auth } from "@voiceify/auth";
import type { AppEnv } from "../lib/types.js";

function extractBearerOrHeader(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  const headerKey = c.req.header("x-voiceify-key")?.trim() ?? "";
  const authHeader = c.req.header("authorization")?.trim() ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  return headerKey || bearer;
}

/**
 * Accept either a Better Auth session cookie or an org API key (`vfk_…`).
 * API keys act as the org owner for RBAC on subsequent requireOrg().
 */
export const requireSessionOrOrgApiKey = createMiddleware<AppEnv>(
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      c.set("user", session.user);
      c.set("session", session.session);
      await next();
      return;
    }

    const provided = extractBearerOrHeader(c);
    if (!provided.startsWith("vfk_")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const keyHash = createHash("sha256").update(provided).digest("hex");
    const [keyRow] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt),
        ),
      )
      .limit(1);

    if (!keyRow) {
      return c.json({ error: "Invalid or revoked API key" }, 401);
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, keyRow.orgId))
      .limit(1);
    if (!org || org.status === "suspended") {
      return c.json({ error: "Organization unavailable" }, 403);
    }

    const [owner] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, keyRow.orgId),
          eq(orgMembers.role, "owner"),
        ),
      )
      .limit(1);

    if (!owner) {
      return c.json({ error: "Organization has no owner" }, 403);
    }

    const routeOrgId = c.req.param("orgId");
    if (routeOrgId && routeOrgId !== keyRow.orgId) {
      return c.json({ error: "API key does not belong to this organization" }, 403);
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRow.id));

    c.set("user", {
      id: owner.userId,
      email: "api-key@voiceify.local",
      name: "API Key",
    } as AppEnv["Variables"]["user"]);
    c.set("session", {
      id: `apikey:${keyRow.id}`,
      userId: owner.userId,
      expiresAt: new Date(Date.now() + 60_000),
      token: `apikey:${keyRow.id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AppEnv["Variables"]["session"]);
    await next();
  },
);
