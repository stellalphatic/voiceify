/**
 * Public marketing contact form. Persists every submission and, when Resend is
 * configured, notifies the sales inbox. Unauthenticated by design, so it is
 * rate limited and validated strictly.
 */
import {
  contactMessageEmail,
  isEmailConfigured,
  sendTransactionalEmail,
} from "@voiceify/auth";
import { contactMessages, db } from "@voiceify/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../lib/types.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const contactRoutes = new Hono<AppEnv>();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a bit more").max(5000),
  /** Honeypot: real users never see this field. */
  website: z.string().max(0).optional(),
});

contactRoutes.post(
  "/contact",
  rateLimit({ limit: 5, prefix: "contact" }),
  async (c) => {
    const parsed = contactSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid submission",
          field: parsed.error.issues[0]?.path[0] ?? null,
        },
        400,
      );
    }

    const { name, email, company, message } = parsed.data;

    const [row] = await db
      .insert(contactMessages)
      .values({
        name,
        email,
        company: company || null,
        message,
        sourceIp:
          c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
          c.req.header("x-real-ip") ??
          null,
        userAgent: c.req.header("user-agent") ?? null,
      })
      .returning();

    if (!row) return c.json({ error: "Failed to save message" }, 500);

    const salesInbox = (process.env.CONTACT_INBOX_EMAIL ?? "").trim();
    if (salesInbox && isEmailConfigured()) {
      const content = contactMessageEmail({ name, email, company, message });
      // Delivery is best-effort: the submission is already durable in Postgres.
      void sendTransactionalEmail({
        to: salesInbox,
        replyTo: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }).catch(() => undefined);
    }

    return c.json({ ok: true, id: row.id }, 201);
  },
);
