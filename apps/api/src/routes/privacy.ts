/**
 * Privacy / GDPR-oriented data export for the authenticated org member.
 * Returns a machine-readable snapshot of account + workspace data the user can download.
 */
import {
  agents,
  conversations,
  creditLedger,
  db,
  eq,
  knowledgeDocs,
  messages,
  orgMembers,
  tools,
} from "@voiceify/db";
import { Hono } from "hono";
import type { AppEnv } from "../lib/types.js";
import { requireOrg } from "../middleware/org.js";
import { requireSession } from "../middleware/session.js";

export const privacyRoutes = new Hono<AppEnv>();

privacyRoutes.use("*", requireSession);

privacyRoutes.get(
  "/:orgId/privacy/export",
  requireOrg("billing:read"),
  async (c) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const org = c.get("organization");

    const [memberRows, agentRows, toolRows, docRows, convoRows, ledgerRows] =
      await Promise.all([
        db.select().from(orgMembers).where(eq(orgMembers.orgId, orgId)),
        db.select().from(agents).where(eq(agents.orgId, orgId)),
        db.select().from(tools).where(eq(tools.orgId, orgId)),
        db.select().from(knowledgeDocs).where(eq(knowledgeDocs.orgId, orgId)),
        db
          .select()
          .from(conversations)
          .where(eq(conversations.orgId, orgId))
          .limit(200),
        db
          .select()
          .from(creditLedger)
          .where(eq(creditLedger.orgId, orgId))
          .limit(100),
      ]);

    const convoIds = convoRows.map((x) => x.id);
    const messageRows =
      convoIds.length === 0
        ? []
        : await db
            .select()
            .from(messages)
            .where(eq(messages.orgId, orgId))
            .limit(1000);

    const payload = {
      exportedAt: new Date().toISOString(),
      purpose: "Subject access / data portability export",
      retentionNote:
        "Voiceify retains conversation and usage records for billing, abuse prevention, and product improvement. Contact support to request erasure.",
      requester: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: org.id,
        name: org.name,
        creditBalanceCents: org.creditBalanceCents,
      },
      members: memberRows.map((m) => ({
        userId: m.userId,
        role: m.role,
        createdAt: m.createdAt,
      })),
      agents: agentRows.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        language: a.language,
        createdAt: a.createdAt,
      })),
      tools: toolRows.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        type: t.type,
      })),
      knowledgeDocs: docRows.map((d) => ({
        id: d.id,
        title: d.title,
        filename: d.filename,
        status: d.status,
        createdAt: d.createdAt,
      })),
      conversations: convoRows,
      messages: messageRows.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      creditLedger: ledgerRows,
    };

    c.header(
      "content-disposition",
      `attachment; filename="voiceify-export-${orgId.slice(0, 8)}.json"`,
    );
    return c.json(payload);
  },
);
