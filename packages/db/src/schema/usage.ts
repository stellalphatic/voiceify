import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations.js";
import { createdAtColumn, idColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const usageKindEnum = pgEnum("usage_kind", [
  "stt_ms",
  "llm_tokens",
  "tts_chars",
  "tool_call",
]);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    kind: usageKindEnum("kind").notNull(),
    quantity: integer("quantity").notNull(),
    unitCostMicros: integer("unit_cost_micros").notNull().default(0),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("usage_events_org_idx").on(table.orgId),
    index("usage_events_org_created_idx").on(table.orgId, table.createdAt),
  ],
);

export const usageDaily = pgTable(
  "usage_daily",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    sttMs: integer("stt_ms").notNull().default(0),
    llmTokens: integer("llm_tokens").notNull().default(0),
    ttsChars: integer("tts_chars").notNull().default(0),
    toolCalls: integer("tool_calls").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
  },
  (table) => [
    uniqueIndex("usage_daily_org_day_uidx").on(table.orgId, table.day),
    index("usage_daily_org_idx").on(table.orgId),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    deltaCents: integer("delta_cents").notNull(),
    reason: text("reason").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("credit_ledger_org_idx").on(table.orgId),
    index("credit_ledger_org_created_idx").on(table.orgId, table.createdAt),
  ],
);

export type UsageKind = (typeof usageKindEnum.enumValues)[number];
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
export type UsageDaily = typeof usageDaily.$inferSelect;
export type NewUsageDaily = typeof usageDaily.$inferInsert;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedger.$inferInsert;
