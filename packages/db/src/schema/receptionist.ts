import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const intakeStatusEnum = pgEnum("intake_status", [
  "new",
  "triaged",
  "escalated",
  "resolved",
  "closed",
]);

export const departments = pgTable(
  "departments",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phoneExt: text("phone_ext"),
    description: text("description"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("departments_org_idx").on(table.orgId)],
);

export const faqEntries = pgTable(
  "faq_entries",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: text("category"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("faq_entries_org_idx").on(table.orgId)],
);

export const intakeMessages = pgTable(
  "intake_messages",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fromName: text("from_name"),
    fromContact: text("from_contact"),
    subject: text("subject"),
    body: text("body").notNull(),
    status: intakeStatusEnum("status").notNull().default("new"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("intake_messages_org_idx").on(table.orgId),
    index("intake_messages_org_status_idx").on(table.orgId, table.status),
  ],
);

export const escalationRules = pgTable(
  "escalation_rules",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    condition: jsonb("condition")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    action: jsonb("action")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    priority: integer("priority").notNull().default(100),
    active: boolean("active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("escalation_rules_org_idx").on(table.orgId)],
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type FaqEntry = typeof faqEntries.$inferSelect;
export type NewFaqEntry = typeof faqEntries.$inferInsert;
export type IntakeMessage = typeof intakeMessages.$inferSelect;
export type NewIntakeMessage = typeof intakeMessages.$inferInsert;
export type EscalationRule = typeof escalationRules.$inferSelect;
export type NewEscalationRule = typeof escalationRules.$inferInsert;
