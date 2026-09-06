import {
  and,
  appointments,
  db,
  departments,
  eq,
  faqEntries,
  intakeMessages,
  menuItems,
  orders,
  reservations,
  services,
} from "@voiceify/db";
import { z } from "zod";

export type PackToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

async function ensureDefaultService(orgId: string): Promise<string> {
  const existing = await db
    .select()
    .from(services)
    .where(eq(services.orgId, orgId))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [row] = await db
    .insert(services)
    .values({
      orgId,
      name: "General appointment",
      description: "Default service",
      durationMinutes: 30,
      priceCents: 0,
    })
    .returning();
  if (!row) throw new Error("Failed to create default service");
  return row.id;
}

/** Execute built-in Automation Pack tools against Postgres (org-scoped). */
export async function executePackTool(
  orgId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<PackToolResult> {
  try {
    switch (toolName) {
      case "create_reservation": {
        const parsed = z
          .object({
            guestName: z.string().trim().min(1).max(120),
            partySize: z.coerce.number().int().min(1).max(50),
            reservedAt: z.coerce.date(),
            guestPhone: z.string().trim().max(40).optional(),
            guestEmail: z.string().email().optional(),
            notes: z.string().max(1000).optional(),
          })
          .safeParse(args);
        if (!parsed.success) {
          return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reservation" };
        }
        const { guestName, partySize, reservedAt, guestPhone, guestEmail, notes } =
          parsed.data;
        const [row] = await db
          .insert(reservations)
          .values({
            orgId,
            guestName,
            guestPhone: guestPhone ?? null,
            guestEmail: guestEmail ?? null,
            partySize,
            reservedAt,
            notes: notes ?? null,
            status: "confirmed",
          })
          .returning();
        return { ok: true, data: row };
      }
      case "check_availability": {
        const parsed = z
          .object({
            partySize: z.coerce.number().int().min(1).max(50),
            reservedAt: z.coerce.date(),
          })
          .safeParse(args);
        if (!parsed.success) {
          return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
        }
        return {
          ok: true,
          data: {
            available: true,
            partySize: parsed.data.partySize,
            requestedAt: parsed.data.reservedAt.toISOString(),
            suggestedTimes: ["18:00", "19:00", "20:00"],
          },
        };
      }
      case "list_menu": {
        const rows = await db
          .select()
          .from(menuItems)
          .where(and(eq(menuItems.orgId, orgId), eq(menuItems.available, true)));
        return { ok: true, data: { items: rows } };
      }
      case "create_order": {
        const rawItems = Array.isArray(args.items) ? args.items : [];
        const orderItems = rawItems.map((it) => {
          const row = it as Record<string, unknown>;
          return {
            name: String(row.name ?? "Item"),
            quantity: Number(row.quantity ?? 1),
            priceCents: Number(row.priceCents ?? 0),
            menuItemId: row.menuItemId ? String(row.menuItemId) : undefined,
          };
        });
        const totalCents = orderItems.reduce(
          (sum, i) => sum + i.priceCents * i.quantity,
          0,
        );
        const [row] = await db
          .insert(orders)
          .values({
            orgId,
            items: orderItems,
            totalCents,
            customerName: args.customerName ? String(args.customerName) : null,
            customerPhone: args.customerPhone
              ? String(args.customerPhone)
              : null,
            notes: args.notes ? String(args.notes) : null,
            status: "confirmed",
          })
          .returning();
        return { ok: true, data: row };
      }
      case "create_intake": {
        const body = String(args.body ?? args.message ?? "").trim();
        if (!body) return { ok: false, error: "body required" };
        const [row] = await db
          .insert(intakeMessages)
          .values({
            orgId,
            body,
            fromName: args.fromName ? String(args.fromName) : null,
            fromContact: args.fromContact ? String(args.fromContact) : null,
            subject: args.subject ? String(args.subject) : null,
          })
          .returning();
        return { ok: true, data: row };
      }
      case "route_to_department": {
        const name = String(args.department ?? args.name ?? "").toLowerCase();
        const deps = await db
          .select()
          .from(departments)
          .where(eq(departments.orgId, orgId));
        const match = deps.find((d) => d.name.toLowerCase().includes(name));
        return {
          ok: true,
          data: match
            ? { routed: true, department: match }
            : { routed: false, message: "No matching department" },
        };
      }
      case "lookup_faq": {
        const q = String(args.query ?? args.question ?? "").toLowerCase();
        const faqs = await db
          .select()
          .from(faqEntries)
          .where(eq(faqEntries.orgId, orgId));
        const hits = faqs
          .filter(
            (f) =>
              f.question.toLowerCase().includes(q) ||
              f.answer.toLowerCase().includes(q),
          )
          .slice(0, 3);
        return { ok: true, data: { hits } };
      }
      case "book_appointment": {
        const parsed = z
          .object({
            serviceId: z.string().uuid().optional(),
            startsAt: z.coerce.date(),
            customerName: z.string().trim().min(1).max(120),
            customerContact: z.string().trim().min(1).max(160),
            notes: z.string().max(1000).optional(),
          })
          .safeParse(args);
        if (!parsed.success) {
          return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid appointment" };
        }
        const serviceId =
          parsed.data.serviceId ||
          (await ensureDefaultService(orgId));
        const startsAt = parsed.data.startsAt;
        const customerName = parsed.data.customerName;
        const svcRows = await db
          .select()
          .from(services)
          .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)))
          .limit(1);
        const duration = svcRows[0]?.durationMinutes ?? 30;
        const endsAt = new Date(startsAt.getTime() + duration * 60_000);
        const [row] = await db
          .insert(appointments)
          .values({
            orgId,
            serviceId,
            customerName,
            customerContact: parsed.data.customerContact,
            startsAt,
            endsAt,
            status: "confirmed",
            notes: parsed.data.notes ?? null,
          })
          .returning();
        return { ok: true, data: row };
      }
      case "cancel_appointment": {
        const id = String(args.appointmentId ?? args.id ?? "");
        if (!id) return { ok: false, error: "appointmentId required" };
        const [row] = await db
          .update(appointments)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(and(eq(appointments.id, id), eq(appointments.orgId, orgId)))
          .returning();
        return row
          ? { ok: true, data: row }
          : { ok: false, error: "Appointment not found" };
      }
      case "reschedule_appointment": {
        const id = String(args.appointmentId ?? args.id ?? "");
        const startsAt = new Date(String(args.startsAt ?? args.datetime ?? ""));
        if (!id || Number.isNaN(startsAt.getTime())) {
          return { ok: false, error: "appointmentId and startsAt required" };
        }
        const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
        const [row] = await db
          .update(appointments)
          .set({ startsAt, endsAt, status: "scheduled", updatedAt: new Date() })
          .where(and(eq(appointments.id, id), eq(appointments.orgId, orgId)))
          .returning();
        return row
          ? { ok: true, data: row }
          : { ok: false, error: "Appointment not found" };
      }
      default:
        return { ok: false, error: `Unknown pack tool: ${toolName}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Pack tool failed",
    };
  }
}
