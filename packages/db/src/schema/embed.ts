import {
  index,
  jsonb,
  pgTable,
  text,
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
export type SimulationScenario = typeof simulationScenarios.$inferSelect;
export type NewSimulationScenario = typeof simulationScenarios.$inferInsert;
