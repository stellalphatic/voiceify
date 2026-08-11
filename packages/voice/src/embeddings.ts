/**
 * Real semantic embedding providers.
 *
 * Production can use an OpenAI-compatible endpoint backed by an open-source
 * model (recommended: BAAI/bge-m3 via Hugging Face TEI), or Gemini as a managed
 * fallback. There is deliberately no bag-of-hash fallback: lexical search is
 * more honest than labelling token hashes as semantic vectors.
 */

const REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_GEMINI_MODEL = "gemini-embedding-001";

export type SemanticEmbeddingProvider = "openai-compatible" | "gemini";

export type EmbeddingBatch = {
  vectors: number[][];
  provider: SemanticEmbeddingProvider;
  model: string;
};

function compatibleEndpoint(): string | null {
  const value = process.env.EMBEDDING_API_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

function embeddingModel(): string {
  return (
    process.env.EMBEDDING_MODEL?.trim() ||
    process.env.GEMINI_EMBEDDING_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

export function isSemanticEmbeddingConfigured(): boolean {
  return Boolean(
    compatibleEndpoint() || process.env.GEMINI_API_KEY?.trim(),
  );
}

export function semanticEmbeddingProvider(): SemanticEmbeddingProvider | null {
  if (compatibleEndpoint()) return "openai-compatible";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  return null;
}

function validateVectors(
  vectors: unknown,
  expected: number,
): number[][] {
  if (!Array.isArray(vectors) || vectors.length !== expected) {
    throw new Error("Embedding provider returned an unexpected batch size");
  }

  const parsed = vectors.map((vector) => {
    if (
      !Array.isArray(vector) ||
      vector.length === 0 ||
      !vector.every((value) => Number.isFinite(value))
    ) {
      throw new Error("Embedding provider returned an invalid vector");
    }
    return vector as number[];
  });

  const dimensions = parsed[0]!.length;
  if (!parsed.every((vector) => vector.length === dimensions)) {
    throw new Error("Embedding provider returned inconsistent dimensions");
  }
  return parsed;
}

async function embedWithCompatibleApi(
  endpoint: string,
  texts: string[],
): Promise<EmbeddingBatch> {
  const model = embeddingModel();
  const key = process.env.EMBEDDING_API_KEY?.trim();
  const url = endpoint.endsWith("/embeddings")
    ? endpoint
    : `${endpoint}/v1/embeddings`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ model, input: texts }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Embedding request failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ index?: number; embedding?: unknown }>;
  };
  const ordered = [...(data.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  return {
    vectors: validateVectors(
      ordered.map((item) => item.embedding),
      texts.length,
    ),
    provider: "openai-compatible",
    model,
  };
}

async function embedWithGemini(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<EmbeddingBatch> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
        })),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gemini embedding failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    embeddings?: Array<{ values?: unknown }>;
  };
  return {
    vectors: validateVectors(
      (data.embeddings ?? []).map((item) => item.values),
      texts.length,
    ),
    provider: "gemini",
    model,
  };
}

export async function embedTexts(texts: string[]): Promise<EmbeddingBatch> {
  const cleaned = texts.map((text) => text.trim());
  if (cleaned.length === 0 || cleaned.some((text) => !text)) {
    throw new Error("Embedding input must contain non-empty text");
  }

  const endpoint = compatibleEndpoint();
  if (endpoint) return embedWithCompatibleApi(endpoint, cleaned);
  if (process.env.GEMINI_API_KEY?.trim()) {
    return embedWithGemini(cleaned, "RETRIEVAL_DOCUMENT");
  }
  throw new Error(
    "Semantic embeddings are not configured. Set EMBEDDING_API_URL or GEMINI_API_KEY.",
  );
}

export async function embedQuery(text: string): Promise<number[]> {
  const cleaned = text.trim();
  if (!cleaned) throw new Error("Embedding query must not be empty");
  const endpoint = compatibleEndpoint();
  const result = endpoint
    ? await embedWithCompatibleApi(endpoint, [cleaned])
    : await embedWithGemini([cleaned], "RETRIEVAL_QUERY");
  return result.vectors[0]!;
}
