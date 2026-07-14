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

export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "owner",
  "admin",
  "member",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const orgStatusEnum = pgEnum("org_status", [
  "active",
  "suspended",
]);

export const plans = pgTable(
  "plans",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    monthlyCredits: integer("monthly_credits").notNull(),
    maxAgents: integer("max_agents").notNull(),
    maxMinutes: integer("max_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    features: jsonb("features").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [uniqueIndex("plans_slug_uidx").on(table.slug)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    planId: uuid("plan_id").references(() => plans.id, {
      onDelete: "set null",
    }),
    creditBalanceCents: integer("credit_balance_cents").notNull().default(0),
    status: orgStatusEnum("status").notNull().default("active"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: orgMemberRoleEnum("role").notNull().default("member"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("org_members_org_user_uidx").on(table.orgId, table.userId),
    index("org_members_user_idx").on(table.userId),
    index("org_members_org_idx").on(table.orgId),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAtColumn(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("api_keys_org_idx").on(table.orgId),
    uniqueIndex("api_keys_key_hash_uidx").on(table.keyHash),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("subscriptions_org_idx").on(table.orgId),
    uniqueIndex("subscriptions_stripe_sub_uidx").on(table.stripeSubscriptionId),
  ],
);

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  plan: one(plans, {
    fields: [organizations.planId],
    references: [plans.id],
  }),
  members: many(orgMembers),
  apiKeys: many(apiKeys),
  subscriptions: many(subscriptions),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(user, {
    fields: [orgMembers.userId],
    references: [user.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  organizations: many(organizations),
  subscriptions: many(subscriptions),
}));

export type OrgMemberRole = (typeof orgMemberRoleEnum.enumValues)[number];
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
