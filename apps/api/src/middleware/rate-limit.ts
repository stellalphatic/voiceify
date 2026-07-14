import { createMiddleware } from "hono/factory";
import { redisIncrWindow } from "../lib/redis.js";

const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60);

export function rateLimit(opts?: { limit?: number; prefix?: string }) {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const prefix = opts?.prefix ?? "rl";

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `${prefix}:${ip}:${Math.floor(Date.now() / 60_000)}`;

    try {
      const count = await redisIncrWindow(key, 70);
      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      if (count > limit) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    } catch {
      // Fail open if Redis is down so local demos still work.
    }
    await next();
  });
}
