import {
  creditLedger,
  db,
  eq,
  organizations,
  usageEvents,
  type UsageKind,
} from "@voiceify/db";
import {
  checkCredits,
  debitCredits,
  estimateUsageCents,
} from "@voiceify/usage";

export async function assertOrgHasCredits(orgId: string): Promise<{
  allowed: boolean;
  balanceCents: number;
  softWarn: boolean;
}> {
  const [org] = await db
    .select({ creditBalanceCents: organizations.creditBalanceCents })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const balanceCents = org?.creditBalanceCents ?? 0;
  const gate = checkCredits({ balanceCents });
  return {
    allowed: gate.allowed,
    balanceCents,
    softWarn: gate.softWarn,
  };
}

export async function recordUsageAndDebit(input: {
  orgId: string;
  conversationId?: string;
  sttMs?: number;
  llmTokens?: number;
  ttsChars?: number;
  toolCalls?: number;
}): Promise<{ balanceAfter: number; debitedCents: number }> {
  const events: Array<{ kind: UsageKind; quantity: number }> = [];
  if (input.sttMs) events.push({ kind: "stt_ms", quantity: input.sttMs });
  if (input.llmTokens)
    events.push({ kind: "llm_tokens", quantity: input.llmTokens });
  if (input.ttsChars)
    events.push({ kind: "tts_chars", quantity: input.ttsChars });
  if (input.toolCalls)
    events.push({ kind: "tool_call", quantity: input.toolCalls });

  if (events.length > 0) {
    await db.insert(usageEvents).values(
      events.map((e) => ({
        orgId: input.orgId,
        conversationId: input.conversationId,
        kind: e.kind,
        quantity: e.quantity,
      })),
    );
  }

  const amountCents = Math.max(
    1,
    estimateUsageCents({
      sttMs: input.sttMs,
      llmTokens: input.llmTokens,
      ttsChars: input.ttsChars,
      toolCalls: input.toolCalls,
    }),
  );

  return db.transaction(async (tx) => {
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const result = debitCredits({
      balanceCents: org.creditBalanceCents,
      amountCents,
      reason: "voice_turn",
      refType: "conversation",
      refId: input.conversationId,
    });

    if (!result.ok) {
      return { balanceAfter: org.creditBalanceCents, debitedCents: 0 };
    }

    await tx
      .update(organizations)
      .set({
        creditBalanceCents: result.balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, input.orgId));

    await tx.insert(creditLedger).values({
      orgId: input.orgId,
      deltaCents: result.deltaCents,
      reason: result.reason,
      refType: result.refType,
      refId: result.refId,
      balanceAfter: result.balanceAfter,
    });

    return {
      balanceAfter: result.balanceAfter,
      debitedCents: amountCents,
    };
  });
}

export async function grantCredits(input: {
  orgId: string;
  amountCents: number;
  reason: string;
  refType?: string;
  refId?: string;
}): Promise<number> {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .limit(1);

    if (!org) throw new Error("Organization not found");

    const balanceAfter = org.creditBalanceCents + input.amountCents;
    await tx
      .update(organizations)
      .set({ creditBalanceCents: balanceAfter, updatedAt: new Date() })
      .where(eq(organizations.id, input.orgId));

    await tx.insert(creditLedger).values({
      orgId: input.orgId,
      deltaCents: input.amountCents,
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      balanceAfter,
    });

    return balanceAfter;
  });
}
