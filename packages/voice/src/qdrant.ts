/**
 * Optional Qdrant client for tenant-scoped knowledge vectors.
 * Falls back silently when QDRANT_URL is unset — Postgres remains source of truth.
 */

export type QdrantPoint = {
  id: string;
  vector: number[];
  payload: {
    orgId: string;
    docId: string;
    chunkIndex: number;
    content: string;
  };
};

function qdrantUrl(): string | null {
  const url = process.env.QDRANT_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

function qdrantHeaders(): HeadersInit {
  const key = process.env.QDRANT_API_KEY?.trim();
  return {
    "content-type": "application/json",
    ...(key ? { "api-key": key } : {}),
  };
}

export function isQdrantConfigured(): boolean {
  return Boolean(qdrantUrl());
}

export function collectionName(orgId: string): string {
  const safe = orgId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const version = (process.env.EMBEDDING_COLLECTION_VERSION?.trim() || "v2")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `voiceify_kb_${version}_${safe}`;
}

export async function ensureCollection(
  orgId: string,
  vectorSize: number,
): Promise<void> {
  const base = qdrantUrl();
  if (!base) return;
  const name = collectionName(orgId);
  const existing = await fetch(`${base}/collections/${name}`, {
    headers: qdrantHeaders(),
    signal: AbortSignal.timeout(8_000),
  });
  if (existing.ok) return;

  const create = await fetch(`${base}/collections/${name}`, {
    method: "PUT",
    headers: qdrantHeaders(),
    body: JSON.stringify({
      vectors: { size: vectorSize, distance: "Cosine" },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!create.ok && create.status !== 409) {
    const text = await create.text().catch(() => "");
    throw new Error(`Qdrant create collection failed: ${create.status} ${text}`);
  }
}

export async function upsertPoints(
  orgId: string,
  points: QdrantPoint[],
): Promise<void> {
  const base = qdrantUrl();
  if (!base || points.length === 0) return;
  await ensureCollection(orgId, points[0]!.vector.length);
  const res = await fetch(
    `${base}/collections/${collectionName(orgId)}/points?wait=true`,
    {
      method: "PUT",
      headers: qdrantHeaders(),
      body: JSON.stringify({
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qdrant upsert failed: ${res.status} ${text}`);
  }
}

export async function searchPoints(input: {
  orgId: string;
  vector: number[];
  limit?: number;
  docIds?: string[];
  scoreThreshold?: number;
}): Promise<Array<{ content: string; docId: string; score: number }>> {
  const base = qdrantUrl();
  if (!base) return [];
  const res = await fetch(
    `${base}/collections/${collectionName(input.orgId)}/points/search`,
    {
      method: "POST",
      headers: qdrantHeaders(),
      body: JSON.stringify({
        vector: input.vector,
        limit: input.limit ?? 8,
        with_payload: true,
        score_threshold: input.scoreThreshold ?? 0.25,
        ...(input.docIds?.length
          ? {
              filter: {
                must: [
                  {
                    key: "docId",
                    match: { any: input.docIds },
                  },
                ],
              },
            }
          : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    result?: Array<{
      score: number;
      payload?: { content?: string; docId?: string };
    }>;
  };
  return (data.result ?? [])
    .map((r) => ({
      content: String(r.payload?.content ?? ""),
      docId: String(r.payload?.docId ?? ""),
      score: r.score,
    }))
    .filter((r) => r.content);
}
