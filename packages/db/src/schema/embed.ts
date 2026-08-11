import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { createdAtColumn, idColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const embedConfigs = pgTable(
  "embed_configs",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    allowedOrigins: jsonb("allowed_origins")
      .$type<string[]>()
      .notNull()
      .default([]),
    theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("embed_configs_public_key_uidx").on(table.publicKey),
    index("embed_configs_org_idx").on(table.orgId),
    index("embed_configs_agent_idx").on(table.agentId),
  ],
);

export const embedSessions = pgTable(
  "embed_sessions",
  {
    id: idColumn(),
    configId: uuid("config_id")
      .notNull()
      .references(() => embedConfigs.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    origin: text("origin").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("embed_sessions_token_hash_uidx").on(table.tokenHash),
    index("embed_sessions_config_idx").on(table.configId),
    index("embed_sessions_org_agent_idx").on(table.orgId, table.agentId),
    index("embed_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const simulationScenarios = pgTable(
  "simulation_scenarios",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    utterances: jsonb("utterances").$type<string[]>().notNull().default([]),
    expectations: jsonb("expectations")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("simulation_scenarios_org_idx").on(table.orgId),
    index("simulation_scenarios_agent_idx").on(table.agentId),
  ],
);

export type EmbedConfig = typeof embedConfigs.$inferSelect;
export type NewEmbedConfig = typeof embedConfigs.$inferInsert;
export type EmbedSession = typeof embedSessions.$inferSelect;
export type NewEmbedSession = typeof embedSessions.$inferInsert;
export type SimulationScenario = typeof simulationScenarios.$inferSelect;
export type NewSimulationScenario = typeof simulationScenarios.$inferInsert;
