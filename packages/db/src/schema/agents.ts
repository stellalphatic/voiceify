import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { createdAtColumn, idColumn, updatedAtColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const agentStatusEnum = pgEnum("agent_status", [
  "draft",
  "active",
  "paused",
]);

export const toolTypeEnum = pgEnum("tool_type", ["http", "builtin", "pack"]);

export const automationPackEnum = pgEnum("automation_pack", [
  "restaurant",
  "receptionist",
  "appointments",
]);

export const workflowStatusEnum = pgEnum("workflow_status", ["draft", "active"]);

export const agents = pgTable(
  "agents",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    language: text("language").notNull().default("en"),
    status: agentStatusEnum("status").notNull().default("draft"),
    greeting: text("greeting"),
    instructions: text("instructions").notNull().default(""),
    voiceId: text("voice_id"),
    capabilities: jsonb("capabilities")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    triggers: jsonb("triggers")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    guardrails: jsonb("guardrails")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    deployedVersionId: uuid("deployed_version_id"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("agents_org_idx").on(table.orgId),
    index("agents_org_status_idx").on(table.orgId, table.status),
  ],
);

export const agentVersions = pgTable(
  "agent_versions",
  {
    id: idColumn(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    voiceId: text("voice_id"),
    greeting: text("greeting"),
    language: text("language").notNull().default("en"),
    toolIds: jsonb("tool_ids").$type<string[]>().notNull().default([]),
    knowledgeDocIds: jsonb("knowledge_doc_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAtColumn(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("agent_versions_agent_version_uidx").on(
      table.agentId,
      table.version,
    ),
    index("agent_versions_org_idx").on(table.orgId),
  ],
);

export const tools = pgTable(
  "tools",
  {
    id: idColumn(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    type: toolTypeEnum("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    inputSchema: jsonb("input_schema")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("tools_org_idx").on(table.orgId),
    uniqueIndex("tools_org_slug_uidx").on(table.orgId, table.slug),
  ],
);

export const automationInstalls = pgTable(
  "automation_installs",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    packId: automationPackEnum("pack_id").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    installedAt: timestamp("installed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_installs_org_pack_uidx").on(table.orgId, table.packId),
    index("automation_installs_org_idx").on(table.orgId),
  ],
);

export const workflows = pgTable(
  "workflows",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Conversation flow"),
    status: workflowStatusEnum("status").notNull().default("draft"),
    graph: jsonb("graph")
      .$type<{
        nodes: Array<Record<string, unknown>>;
        edges: Array<Record<string, unknown>>;
      }>()
      .notNull()
      .default({ nodes: [], edges: [] }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("workflows_org_agent_uidx").on(table.orgId, table.agentId),
    index("workflows_org_status_idx").on(table.orgId, table.status),
  ],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [agents.orgId],
    references: [organizations.id],
  }),
  versions: many(agentVersions),
}));

export const agentVersionsRelations = relations(agentVersions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentVersions.agentId],
    references: [agents.id],
  }),
  organization: one(organizations, {
    fields: [agentVersions.orgId],
    references: [organizations.id],
  }),
}));

export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];
export type ToolType = (typeof toolTypeEnum.enumValues)[number];
export type AutomationPack = (typeof automationPackEnum.enumValues)[number];
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentVersion = typeof agentVersions.$inferSelect;
export type NewAgentVersion = typeof agentVersions.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type AutomationInstall = typeof automationInstalls.$inferSelect;
export type NewAutomationInstall = typeof automationInstalls.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
