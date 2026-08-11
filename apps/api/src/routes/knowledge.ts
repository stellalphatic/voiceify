import {
  and,
  db,
  eq,
  knowledgeChunks,
  knowledgeDocs,
  sql,
} from "@voiceify/db";
import {
  embedQuery,
  embedTexts,
  isQdrantConfigured,
  isSemanticEmbeddingConfigured,
  searchPoints,
  upsertPoints,
} from "@voiceify/voice";
import { createHash } from "node:crypto";
import { unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const knowledgeRoutes = new Hono<AppEnv>();

knowledgeRoutes.use("*", requireSession);

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.resolve("data/uploads");

function chunkText(text: string, size = 900, overlap = 140): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(cleaned.length, start + size);
    if (end < cleaned.length) {
      const boundary = Math.max(
        cleaned.lastIndexOf("\n", end),
        cleaned.lastIndexOf(". ", end),
        cleaned.lastIndexOf(" ", end),
      );
      if (boundary > start + size / 2) end = boundary + 1;
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return s;
}

function parseEmbedding(tsv: string | null): number[] | null {
  if (!tsv?.startsWith("emb2:")) return null;
  try {
    const parsed = JSON.parse(tsv.slice(5)) as number[];
    return Array.isArray(parsed) && parsed.every(Number.isFinite)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function ingestDocument(input: {
  orgId: string;
  title: string;
  filename: string;
  mimeType: string;
  content: string;
  /** Empty array means the document is shared with every agent in the org. */
  agentIds?: string[];
}) {
  const pieces = chunkText(input.content);
  if (!pieces.length) {
    throw new Error("No extractable text found in document");
  }

  const [doc] = await db
    .insert(knowledgeDocs)
    .values({
      orgId: input.orgId,
      title: input.title,
      filename: input.filename,
      mimeType: input.mimeType,
      status: "processing",
      agentIds: input.agentIds ?? [],
    })
    .returning();
  if (!doc) throw new Error("Failed to create document");

  try {
    const embeddingBatch = isSemanticEmbeddingConfigured()
      ? await embedTexts(pieces)
      : null;

    await db.insert(knowledgeChunks).values(
      pieces.map((content, chunkIndex) => ({
        docId: doc.id,
        orgId: input.orgId,
        content,
        chunkIndex,
        tsv: embeddingBatch
          ? `emb2:${JSON.stringify(embeddingBatch.vectors[chunkIndex])}`
          : null,
      })),
    );

    // Qdrant is the semantic index; Postgres remains the durable source.
    let vectorBackend:
      | "postgres-keyword"
      | "postgres-semantic"
      | "qdrant+postgres" = embeddingBatch
      ? "postgres-semantic"
      : "postgres-keyword";
    let vectorWarning: string | null = null;
    if (embeddingBatch && isQdrantConfigured()) {
      try {
        await upsertPoints(
          input.orgId,
          pieces.map((content, chunkIndex) => {
            const h = createHash("md5")
              .update(`${doc.id}:${chunkIndex}`)
              .digest("hex");
            const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
            return {
              id,
              vector: embeddingBatch.vectors[chunkIndex]!,
              payload: {
                orgId: input.orgId,
                docId: doc.id,
                chunkIndex,
                content,
              },
            };
          }),
        );
        vectorBackend = "qdrant+postgres";
      } catch (error) {
        vectorWarning =
          error instanceof Error
            ? `Qdrant mirror failed: ${error.message}`
            : "Qdrant mirror failed";
      }
    }

    await db
      .update(knowledgeDocs)
      .set({ status: "ready" })
      .where(eq(knowledgeDocs.id, doc.id));

    return {
      doc: { ...doc, status: "ready" as const },
      chunks: pieces.length,
      vectorBackend,
      vectorWarning,
      embeddingProvider: embeddingBatch?.provider ?? null,
      embeddingModel: embeddingBatch?.model ?? null,
    };
  } catch (error) {
    await db
      .update(knowledgeDocs)
      .set({ status: "failed" })
      .where(eq(knowledgeDocs.id, doc.id));
    throw error;
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

knowledgeRoutes.get(
  "/:orgId/knowledge",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const docs = await db
      .select()
      .from(knowledgeDocs)
      .where(eq(knowledgeDocs.orgId, orgId));
    return c.json({ docs });
  },
);

knowledgeRoutes.post(
  "/:orgId/knowledge",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const body = z
      .object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(200_000),
        filename: z.string().max(200).optional(),
        agentIds: z.array(z.string().uuid()).max(50).optional(),
      })
      .parse(await c.req.json());

    const filename = body.filename ?? `${body.title.replace(/\s+/g, "-")}.txt`;
    const result = await ingestDocument({
      orgId,
      title: body.title,
      filename,
      mimeType: "text/plain",
      content: body.content,
      agentIds: body.agentIds,
    });
    return c.json(result, 201);
  },
);

knowledgeRoutes.post(
  "/:orgId/knowledge/upload",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const form = await c.req.parseBody();
    const file = form.file;
    const titleRaw = typeof form.title === "string" ? form.title.trim() : "";
    const agentIds =
      typeof form.agentIds === "string" && form.agentIds.trim()
        ? form.agentIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 50)
        : [];

    if (!(file instanceof File)) {
      return c.json({ error: "file is required (PDF or DOCX)" }, 400);
    }
    if (file.size > 8_000_000) {
      return c.json({ error: "File too large (max 8MB)" }, 400);
    }

    const filename = file.name || "upload.bin";
    const lower = filename.toLowerCase();
    const mime = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());

    let content = "";
    let mimeType = mime;
    try {
      if (lower.endsWith(".pdf") || mime.includes("pdf")) {
        content = await extractPdf(buffer);
        mimeType = "application/pdf";
      } else if (
        lower.endsWith(".docx") ||
        mime.includes("wordprocessingml") ||
        mime.includes("officedocument")
      ) {
        content = await extractDocx(buffer);
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (lower.endsWith(".txt") || mime.startsWith("text/")) {
        content = buffer.toString("utf8");
        mimeType = "text/plain";
      } else {
        return c.json(
          { error: "Unsupported type. Upload PDF, DOCX, or TXT." },
          400,
        );
      }
    } catch (err) {
      return c.json(
        {
          error:
            err instanceof Error
              ? `Failed to extract text: ${err.message}`
              : "Failed to extract text",
        },
        422,
      );
    }

    content = content.replace(/\u0000/g, "").trim();
    if (content.length < 20) {
      return c.json(
        { error: "Extracted text was empty or too short to index." },
        422,
      );
    }
    if (content.length > 200_000) {
      content = content.slice(0, 200_000);
    }

    // Optionally stage to disk then discard after ingest (no long-term file store).
    const dir = path.join(UPLOAD_ROOT, orgId, "tmp");
    await mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `${Date.now()}-${filename}`);
    await writeFile(tmpPath, buffer);
    try {
      const title =
        titleRaw ||
        filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[-_]+/g, " ") ||
        "Uploaded document";
      const result = await ingestDocument({
        orgId,
        title,
        filename,
        mimeType,
        content,
        agentIds,
      });
      return c.json(
        {
          ...result,
          discardedOriginal: true,
          note: "Original file discarded after text extraction and embedding.",
        },
        201,
      );
    } finally {
      await unlink(tmpPath).catch(() => undefined);
    }
  },
);

knowledgeRoutes.delete(
  "/:orgId/knowledge/:docId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const docId = c.req.param("docId");
    await db
      .delete(knowledgeDocs)
      .where(and(eq(knowledgeDocs.id, docId), eq(knowledgeDocs.orgId, orgId)));
    return c.json({ ok: true });
  },
);

knowledgeRoutes.patch(
  "/:orgId/knowledge/:docId",
  requireOrg("agents:write"),
  async (c) => {
    const orgId = c.get("orgId");
    const docId = c.req.param("docId");
    const body = z
      .object({
        agentIds: z.array(z.string().uuid()).max(50),
        title: z.string().min(1).max(200).optional(),
      })
      .parse(await c.req.json());

    const [doc] = await db
      .update(knowledgeDocs)
      .set({
        agentIds: body.agentIds,
        ...(body.title ? { title: body.title } : {}),
      })
      .where(and(eq(knowledgeDocs.id, docId), eq(knowledgeDocs.orgId, orgId)))
      .returning();
    if (!doc) return c.json({ error: "Document not found" }, 404);
    return c.json({ doc });
  },
);

knowledgeRoutes.get(
  "/:orgId/knowledge/search",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const q = String(c.req.query("q") ?? "").trim();
    if (!q) return c.json({ hits: [] });

    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    let queryEmbedding: number[] | null = null;
    let embeddingWarning: string | null = null;
    if (isSemanticEmbeddingConfigured()) {
      try {
        const vector = await embedQuery(q);
        queryEmbedding = vector;
        if (isQdrantConfigured()) {
          const qHits = await searchPoints({
            orgId,
            vector,
            limit: 8,
          });
          if (qHits.length) {
            return c.json({ hits: qHits, mode: "qdrant" });
          }
        }
      } catch (error) {
        embeddingWarning =
          error instanceof Error ? error.message : "Semantic search failed";
      }
    }

    const rows = await db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, orgId))
      .limit(80);

    const ranked = rows
      .map((row) => {
        const emb = parseEmbedding(row.tsv);
        const vectorScore =
          queryEmbedding && emb ? cosine(queryEmbedding, emb) : 0;
        const keywordHit = row.content.toLowerCase().includes(q.toLowerCase())
          ? 0.35
          : 0;
        return { ...row, score: vectorScore * 0.8 + keywordHit };
      })
      .filter(
        (row) =>
          row.score > 0.2 ||
          row.content.toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    // Fallback to ILIKE if ranking found nothing
    if (ranked.length === 0) {
      const hits = await db
        .select()
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.orgId, orgId),
            sql`${knowledgeChunks.content} ILIKE ${pattern}`,
          ),
        )
        .limit(8);
      return c.json({ hits, mode: "keyword", embeddingWarning });
    }

    return c.json({
      hits: ranked,
      mode: queryEmbedding ? "semantic-hybrid" : "keyword",
      embeddingWarning,
    });
  },
);
