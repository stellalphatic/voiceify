import { z } from "zod";

export const creditCheckSchema = z.object({
  balanceCents: z.number().int(),
  /** Soft warning when remaining balance is at or below this (cents). */
  softWarnCents: z.number().int().nonnegative().default(500),
});
export type CreditCheckInput = z.input<typeof creditCheckSchema>;

export type CreditGate =
  | { allowed: true; softWarn: boolean; balanceCents: number }
  | { allowed: false; softWarn: true; balanceCents: number; reason: "insufficient_credits" };

/** Hard-stop at 0; soft-warn when at or below threshold. */
export function checkCredits(input: CreditCheckInput): CreditGate {
  const { balanceCents, softWarnCents } = creditCheckSchema.parse(input);
  if (balanceCents <= 0) {
    return {
      allowed: false,
      softWarn: true,
      balanceCents,
      reason: "insufficient_credits",
    };
  }
  return {
    allowed: true,
    softWarn: balanceCents <= softWarnCents,
    balanceCents,
  };
}

export const debitRequestSchema = z.object({
  balanceCents: z.number().int(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(1).max(200),
  refType: z.string().max(80).optional(),
  refId: z.string().max(120).optional(),
});
export type DebitRequest = z.infer<typeof debitRequestSchema>;

export interface DebitResult {
  ok: boolean;
  balanceAfter: number;
  deltaCents: number;
  reason: string;
  refType?: string;
  refId?: string;
  error?: "insufficient_credits" | "invalid_amount";
}

/**
 * Pure credit debit helper. Persisting to `credit_ledger` is the caller's job.
 */
export function debitCredits(input: DebitRequest): DebitResult {
  const parsed = debitRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      balanceAfter: input.balanceCents ?? 0,
      deltaCents: 0,
      reason: "invalid",
      error: "invalid_amount",
    };
  }

  const { balanceCents, amountCents, reason, refType, refId } = parsed.data;
  if (balanceCents < amountCents) {
    return {
      ok: false,
      balanceAfter: balanceCents,
      deltaCents: 0,
      reason,
      refType,
      refId,
      error: "insufficient_credits",
    };
  }

  return {
    ok: true,
    balanceAfter: balanceCents - amountCents,
    deltaCents: -amountCents,
    reason,
    refType,
    refId,
  };
}

/** Estimate billable cents from metered units (stub rates for Phase 0). */
export function estimateUsageCents(usage: {
  sttMs?: number;
  llmTokens?: number;
  ttsChars?: number;
  toolCalls?: number;
}): number {
  const stt = Math.ceil((usage.sttMs ?? 0) / 1000) * 1; // ~1¢ / sec STT
  const llm = Math.ceil((usage.llmTokens ?? 0) / 1000) * 2;
  const tts = Math.ceil((usage.ttsChars ?? 0) / 1000) * 3;
  const tools = (usage.toolCalls ?? 0) * 1;
  return stt + llm + tts + tools;
}
