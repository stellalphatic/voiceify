import { z } from "zod";

export const agentStatusSchema = z.enum(["draft", "active", "paused"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(80),
  language: z.string().min(1).max(40).default("en"),
  greeting: z.string().max(2000).optional(),
  voiceId: z.string().max(120).optional(),
  capabilities: z.record(z.unknown()).default({}),
  triggers: z.record(z.unknown()).default({}),
  guardrails: z.record(z.unknown()).default({}),
});
export type AgentCreateInput = z.infer<typeof agentCreateSchema>;

export const agentUpdateSchema = agentCreateSchema.partial().extend({
  status: agentStatusSchema.optional(),
});
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;

export interface AgentVersionSnapshot {
  version: number;
  name: string;
  type: string;
  language: string;
  greeting?: string;
  voiceId?: string;
  capabilities: Record<string, unknown>;
  triggers: Record<string, unknown>;
  guardrails: Record<string, unknown>;
  createdAt: string;
}

/** Next monotonic version number for an agent. */
export function nextAgentVersion(currentVersion: number | null | undefined): number {
  if (currentVersion == null || currentVersion < 0 || !Number.isFinite(currentVersion)) {
    return 1;
  }
  return Math.floor(currentVersion) + 1;
}

/** Build an immutable version snapshot from current agent fields. */
export function buildAgentVersionSnapshot(
  fields: Omit<AgentVersionSnapshot, "version" | "createdAt"> & {
    version?: number;
    createdAt?: string;
  },
  previousVersion?: number | null,
): AgentVersionSnapshot {
  return {
    version: fields.version ?? nextAgentVersion(previousVersion),
    name: fields.name,
    type: fields.type,
    language: fields.language,
    greeting: fields.greeting,
    voiceId: fields.voiceId,
    capabilities: fields.capabilities,
    triggers: fields.triggers,
    guardrails: fields.guardrails,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}

export function parseAgentCreate(input: unknown): AgentCreateInput {
  return agentCreateSchema.parse(input);
}

export function parseAgentUpdate(input: unknown): AgentUpdateInput {
  return agentUpdateSchema.parse(input);
}
