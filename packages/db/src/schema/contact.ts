import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "./helpers.js";

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "in_progress",
  "closed",
]);

/** Public marketing contact form submissions. Not org-scoped — no auth required. */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: idColumn(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    message: text("message").notNull(),
    status: contactStatusEnum("status").notNull().default("new"),
    sourceIp: text("source_ip"),
    userAgent: text("user_agent"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("contact_messages_status_idx").on(table.status),
    index("contact_messages_created_idx").on(table.createdAt),
  ],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
