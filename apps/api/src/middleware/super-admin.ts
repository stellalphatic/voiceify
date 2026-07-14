import { requireSuperAdmin } from "@voiceify/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";

export const requirePlatformAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const current = c.get("user");
  if (!current) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const admin = await requireSuperAdmin(current.id);
    c.set("user", { ...current, ...admin });
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
