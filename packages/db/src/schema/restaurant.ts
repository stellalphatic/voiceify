import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "./helpers.js";
import { organizations } from "./orgs.js";

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

export const menuItems = pgTable(
  "menu_items",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    category: text("category"),
    available: boolean("available").notNull().default(true),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("menu_items_org_idx").on(table.orgId)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    guestName: text("guest_name").notNull(),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    partySize: integer("party_size").notNull(),
    reservedAt: timestamp("reserved_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    status: reservationStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("reservations_org_idx").on(table.orgId),
    index("reservations_org_reserved_idx").on(table.orgId, table.reservedAt),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: idColumn(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    items: jsonb("items")
      .$type<Array<{ menuItemId?: string; name: string; quantity: number; priceCents: number }>>()
      .notNull()
      .default([]),
    totalCents: integer("total_cents").notNull().default(0),
    status: orderStatusEnum("status").notNull().default("pending"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("orders_org_idx").on(table.orgId)],
);

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
