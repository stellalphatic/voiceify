import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { agentVersions, agents, tools } from "./agents.js";
import { createdAtColumn, idColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "ended",
  "error",
]);

export const conversationChannelEnum = pgEnum("conversation_channel", [
  "sandbox",
  "embed",
  "api",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const toolInvocationStatusEnum = pgEnum("tool_invocation_status", [
  "pending",
  "success",
  "error",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "restrict" }),
    agentVersionId: uuid("agent_version_id").references(() => agentVersions.id, {
      onDelete: "set null",
    }),
    status: conversationStatusEnum("status").notNull().default("active"),
    channel: conversationChannelEnum("channel").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    latencyMs: integer("latency_ms"),
    costEstimateCents: integer("cost_estimate_cents"),
  },
  (table) => [
    index("conversations_org_idx").on(table.orgId),
    index("conversations_agent_idx").on(table.agentId),
    index("conversations_org_started_idx").on(table.orgId, table.startedAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: idColumn(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: createdAtColumn(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_org_idx").on(table.orgId),
  ],
);

export const toolInvocations = pgTable(
  "tool_invocations",
  {
    id: idColumn(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id").references(() => tools.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>(),
    status: toolInvocationStatusEnum("status").notNull().default("pending"),
    durationMs: integer("duration_ms"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("tool_invocations_conversation_idx").on(table.conversationId),
    index("tool_invocations_org_idx").on(table.orgId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type NewToolInvocation = typeof toolInvocations.$inferInsert;
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
export type ConversationChannel =
  (typeof conversationChannelEnum.enumValues)[number];
