import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return client;
}

export async function redisIncrWindow(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect().catch(() => undefined);
  }
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count;
}
