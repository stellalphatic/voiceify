import {
  creditLedger,
  db,
  eq,
  organizations,
  sql,
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
    /**
     * Debit first. Inserting usage before the compare-and-decrement let a
     * failed debit (insufficient funds after a race) still record usage.
     * The predicate runs under Postgres's row lock, so at most one debit can
     * consume the final credits and the balance cannot go below 0.
     */
    const [updated] = await tx
      .update(organizations)
      .set({
        creditBalanceCents: sql`${organizations.creditBalanceCents} - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(
        sql`${organizations.id} = ${input.orgId} AND ${organizations.creditBalanceCents} >= ${amountCents}`,
      )
      .returning({ balanceAfter: organizations.creditBalanceCents });

    if (!updated) {
      const [org] = await tx
        .select({ balanceCents: organizations.creditBalanceCents })
        .from(organizations)
        .where(eq(organizations.id, input.orgId))
        .limit(1);
      if (!org) throw new Error("Organization not found");
      return { balanceAfter: org.balanceCents, debitedCents: 0 };
    }

    if (events.length > 0) {
      await tx.insert(usageEvents).values(
        events.map((event) => ({
          orgId: input.orgId,
          conversationId: input.conversationId,
          kind: event.kind,
          quantity: event.quantity,
        })),
      );
    }

    const result = debitCredits({
      balanceCents: updated.balanceAfter + amountCents,
      amountCents,
      reason: "voice_turn",
      refType: "conversation",
      refId: input.conversationId,
    });
    if (!result.ok) throw new Error("Atomic credit debit invariant failed");

    await tx.insert(creditLedger).values({
      orgId: input.orgId,
      deltaCents: result.deltaCents,
      reason: result.reason,
      refType: result.refType,
      refId: result.refId,
      balanceAfter: updated.balanceAfter,
    });

    return {
      balanceAfter: updated.balanceAfter,
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
    const [updated] = await tx
      .update(organizations)
      .set({
        creditBalanceCents: sql`${organizations.creditBalanceCents} + ${input.amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, input.orgId))
      .returning({ balanceAfter: organizations.creditBalanceCents });
    if (!updated) throw new Error("Organization not found");

    await tx.insert(creditLedger).values({
      orgId: input.orgId,
      deltaCents: input.amountCents,
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      balanceAfter: updated.balanceAfter,
    });

    return updated.balanceAfter;
  });
}
