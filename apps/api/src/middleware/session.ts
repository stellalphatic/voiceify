import { auth } from "@voiceify/auth";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
