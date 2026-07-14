import "dotenv/config";
import { Queue, Worker, type Job } from "bullmq";
import { createHmac } from "node:crypto";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = {
  url: REDIS_URL,
  maxRetriesPerRequest: null,
} as any;

type WebhookJob = {
  deliveryId?: string;
  orgId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
};

type UsageRollupJob = {
  orgId: string;
  day: string;
};

async function deliverWebhook(job: Job<WebhookJob>): Promise<{ ok: boolean; status?: number }> {
  const { url, secret, event, payload } = job.data;
  const body = JSON.stringify({
    event,
    ...payload,
    jobId: job.id,
    ts: new Date().toISOString(),
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-voiceify-signature": signature,
      "x-voiceify-event": event,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Webhook delivery failed: HTTP ${res.status}`);
  }
  return { ok: true, status: res.status };
}

async function processUsageRollup(job: Job<UsageRollupJob>): Promise<{ ok: true }> {
  console.info(`[worker:usage-rollup] org=${job.data.orgId} day=${job.data.day}`);
  // Aggregation runs via SQL in a follow-up when DATABASE_URL is present.
  // Keeping the queue contract stable for apps/api producers.
  return { ok: true };
}

const webhookWorker = new Worker<WebhookJob>("webhooks", deliverWebhook, {
  connection,
  concurrency: 5,
});
const usageWorker = new Worker<UsageRollupJob>("usage-rollup", processUsageRollup, {
  connection,
  concurrency: 2,
});

for (const worker of [webhookWorker, usageWorker]) {
  worker.on("failed", (job, err) => {
    console.error(`[worker] ${worker.name} job ${job?.id} failed`, err.message);
  });
  worker.on("completed", (job) => {
    console.info(`[worker] ${worker.name} job ${job.id} completed`);
  });
}

/** Exported helper so API can enqueue without duplicating queue names. */
export function createWebhookQueue(): Queue<WebhookJob> {
  return new Queue<WebhookJob>("webhooks", { connection });
}

console.info(`[worker] connected to ${REDIS_URL}`);
console.info("[worker] processing queues: webhooks, usage-rollup");

async function shutdown(signal: string): Promise<void> {
  console.info(`[worker] ${signal} received, closing…`);
  await Promise.all([webhookWorker.close(), usageWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
