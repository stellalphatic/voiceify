import { requireSuperAdmin } from "@voiceify/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";

export const requirePlatformAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const sessionUser = c.get("user");
  if (!sessionUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const admin = await requireSuperAdmin(sessionUser.id);
    c.set("user", {
      ...sessionUser,
      // surface platform fields for handlers
      status: admin.status,
      platformRole: admin.platformRole,
    } as typeof sessionUser);
    await next();
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status)
        : 403;
    return c.json(
      { error: err instanceof Error ? err.message : "Forbidden" },
      status === 403 ? 403 : 401,
    );
  }
});
