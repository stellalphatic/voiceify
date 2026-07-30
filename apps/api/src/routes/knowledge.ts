import {
  and,
  db,
  eq,
  knowledgeChunks,
  knowledgeDocs,
  sql,
} from "@voiceify/db";
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
const EMBED_DIMS = 64;

function chunkText(text: string, size = 800): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += size) {
    chunks.push(cleaned.slice(i, i + size));
  }
  return chunks;
}

/** Lightweight local bag-of-hash embedding (no external vector API required). */
function embedText(text: string): number[] {
  const vec = new Array<number>(EMBED_DIMS).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const token of tokens) {
    const h = createHash("sha256").update(token).digest();
    const idx = h.readUInt16BE(0) % EMBED_DIMS;
    const sign = h[2]! & 1 ? 1 : -1;
    vec[idx]! += sign;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    s += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return s;
}

function parseEmbedding(tsv: string | null): number[] | null {
  if (!tsv?.startsWith("emb:")) return null;
  try {
    const parsed = JSON.parse(tsv.slice(4)) as number[];
    return Array.isArray(parsed) ? parsed : null;
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
    })
    .returning();
  if (!doc) throw new Error("Failed to create document");

  await db.insert(knowledgeChunks).values(
    pieces.map((content, chunkIndex) => ({
      docId: doc.id,
      orgId: input.orgId,
      content,
      chunkIndex,
      tsv: `emb:${JSON.stringify(embedText(content))}`,
    })),
  );

  // Optional Qdrant mirror — Postgres remains source of truth for chunks.
  let vectorBackend: "postgres" | "qdrant+postgres" = "postgres";
  try {
    const { isQdrantConfigured, upsertPoints } = await import("@voiceify/voice");
    if (isQdrantConfigured()) {
      await upsertPoints(
        input.orgId,
        pieces.map((content, chunkIndex) => {
          const h = createHash("md5")
            .update(`${doc.id}:${chunkIndex}`)
            .digest("hex");
          const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
          return {
            id,
            vector: embedText(content),
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
    }
  } catch {
    /* Qdrant optional — never fail ingest */
  }

  await db
    .update(knowledgeDocs)
    .set({ status: "ready" })
    .where(eq(knowledgeDocs.id, doc.id));

  return {
    doc: { ...doc, status: "ready" as const },
    chunks: pieces.length,
    vectorBackend,
  };
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
      })
      .parse(await c.req.json());

    const filename = body.filename ?? `${body.title.replace(/\s+/g, "-")}.txt`;
    const result = await ingestDocument({
      orgId,
      title: body.title,
      filename,
      mimeType: "text/plain",
      content: body.content,
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

    const pattern = `%${q.replace(/%/g, "")}%`;
    const queryEmb = embedText(q);

    try {
      const { isQdrantConfigured, searchPoints } = await import("@voiceify/voice");
      if (isQdrantConfigured()) {
        const qHits = await searchPoints({
          orgId,
          vector: queryEmb,
          limit: 8,
        });
        if (qHits.length) {
          return c.json({ hits: qHits, mode: "qdrant" });
        }
      }
    } catch {
      /* fall through to Postgres hybrid */
    }

    const rows = await db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, orgId))
      .limit(80);

    const ranked = rows
      .map((row) => {
        const emb = parseEmbedding(row.tsv);
        const vectorScore = emb ? cosine(queryEmb, emb) : 0;
        const keywordHit = row.content.toLowerCase().includes(q.toLowerCase())
          ? 0.35
          : 0;
        return { ...row, score: vectorScore + keywordHit };
      })
      .filter((r) => r.score > 0.05 || r.content.toLowerCase().includes(q.toLowerCase()))
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
      return c.json({ hits, mode: "keyword" });
    }

    return c.json({ hits: ranked, mode: "hybrid" });
  },
);
