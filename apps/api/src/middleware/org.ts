import {
  OrgAccessError,
  assertCan,
  requireOrgMember,
  type OrgAction,
} from "@voiceify/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";

export function requireOrg(action?: OrgAction) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId =
      c.req.param("orgId") ||
      c.req.header("x-org-id") ||
      c.req.query("orgId");

    if (!orgId) {
      return c.json({ error: "orgId is required" }, 400);
    }

    try {
      const membership = await requireOrgMember(user.id, orgId);
      if (membership.organization.status === "suspended") {
        return c.json({ error: "Organization is suspended" }, 403);
      }
      if (action) {
        assertCan(membership.member.role, action);
      }
      c.set("orgId", orgId);
      c.set("organization", membership.organization);
      c.set("membership", membership.member);
      await next();
    } catch (err) {
      if (err instanceof OrgAccessError) {
        return c.json({ error: err.message }, err.status as 403 | 404 | 400);
      }
      if (err instanceof Error && err.message.startsWith("Forbidden:")) {
        return c.json({ error: err.message }, 403);
      }
      throw err;
    }
  });
}
