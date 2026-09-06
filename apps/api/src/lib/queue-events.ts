import {
  db,
  eq,
  webhookDeliveries,
  webhooks,
} from "@voiceify/db";
import { Queue } from "bullmq";

type WebhookJob = {
  deliveryId: string;
  orgId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
};

type UsageRollupJob = { orgId: string; day: string };

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: Number(redisUrl.pathname.slice(1) || 0),
  ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
};

const webhookQueue = new Queue<WebhookJob>("webhooks", { connection });
const usageQueue = new Queue<UsageRollupJob>("usage-rollup", { connection });

export async function enqueueConversationEnded(input: {
  orgId: string;
  conversationId: string;
  status: string;
}): Promise<void> {
  const hooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.orgId, input.orgId));

  for (const hook of hooks) {
    if (!hook.active || !hook.events.includes("conversation.ended")) continue;
    const payload = {
      conversationId: input.conversationId,
      status: input.status,
    };
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: hook.id,
        orgId: input.orgId,
        event: "conversation.ended",
        payload,
      })
      .returning();
    if (!delivery) continue;
    await webhookQueue.add(
      "conversation.ended",
      {
        deliveryId: delivery.id,
        orgId: input.orgId,
        url: hook.url,
        secret: hook.secret,
        event: "conversation.ended",
        payload,
      },
      {
        jobId: delivery.id,
        attempts: 5,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000,
      },
    );
  }

  await usageQueue.add(
    "daily",
    { orgId: input.orgId, day: new Date().toISOString().slice(0, 10) },
    {
      jobId: `${input.orgId}:${new Date().toISOString().slice(0, 10)}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: true,
    },
  );
}
