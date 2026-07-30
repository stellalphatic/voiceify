import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const knowledgeDocStatusEnum = pgEnum("knowledge_doc_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const knowledgeDocs = pgTable(
  "knowledge_docs",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    status: knowledgeDocStatusEnum("status").notNull().default("pending"),
    /** Empty = available to all agents; otherwise only listed agent UUIDs. */
    agentIds: jsonb("agent_ids").$type<string[]>().notNull().default([]),
    createdAt: createdAtColumn(),
  },
  (table) => [index("knowledge_docs_org_idx").on(table.orgId)],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: idColumn(),
    docId: uuid("doc_id")
      .notNull()
      .references(() => knowledgeDocs.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    /** Optional text column for Postgres FTS (`to_tsvector`) pipelines. */
    tsv: text("tsv"),
    chunkIndex: integer("chunk_index").notNull(),
  },
  (table) => [
    index("knowledge_chunks_doc_idx").on(table.docId),
    index("knowledge_chunks_org_idx").on(table.orgId),
    uniqueIndex("knowledge_chunks_doc_index_uidx").on(
      table.docId,
      table.chunkIndex,
    ),
  ],
);

export type KnowledgeDoc = typeof knowledgeDocs.$inferSelect;
export type NewKnowledgeDoc = typeof knowledgeDocs.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
