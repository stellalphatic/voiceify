import {
  and,
  db,
  eq,
  knowledgeChunks,
  knowledgeDocs,
  sql,
} from "@voiceify/db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const knowledgeRoutes = new Hono<AppEnv>();

knowledgeRoutes.use("*", requireSession);

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.resolve("data/uploads");

function chunkText(text: string, size = 800): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += size) {
    chunks.push(cleaned.slice(i, i + size));
  }
  return chunks;
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
    const dir = path.join(UPLOAD_ROOT, orgId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), body.content, "utf8");

    const [doc] = await db
      .insert(knowledgeDocs)
      .values({
        orgId,
        title: body.title,
        filename,
        mimeType: "text/plain",
        status: "processing",
      })
      .returning();
    if (!doc) return c.json({ error: "Failed to create document" }, 500);

    const pieces = chunkText(body.content);
    if (pieces.length) {
      await db.insert(knowledgeChunks).values(
        pieces.map((content, chunkIndex) => ({
          docId: doc.id,
          orgId,
          content,
          chunkIndex,
          tsv: content,
        })),
      );
    }

    await db
      .update(knowledgeDocs)
      .set({ status: "ready" })
      .where(eq(knowledgeDocs.id, doc.id));

    return c.json({ doc: { ...doc, status: "ready" }, chunks: pieces.length }, 201);
  },
);

knowledgeRoutes.get(
  "/:orgId/knowledge/search",
  requireOrg("agents:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const q = String(c.req.query("q") ?? "").trim();
    if (!q) return c.json({ hits: [] });

    // Simple ILIKE FTS fallback (works without pg tsv indexes)
    const pattern = `%${q.replace(/%/g, "")}%`;
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

    return c.json({ hits });
  },
);
