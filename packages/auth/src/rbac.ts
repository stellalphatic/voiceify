import type { OrgMemberRole } from "@voiceify/db";

export type OrgAction =
  | "org:read"
  | "org:update"
  | "org:delete"
  | "members:read"
  | "members:invite"
  | "members:update"
  | "members:remove"
  | "billing:read"
  | "billing:manage"
  | "api_keys:read"
  | "api_keys:manage"
  | "agents:read"
  | "agents:write"
  | "agents:deploy"
  | "conversations:read"
  | "usage:read"
  | "webhooks:manage"
  | "embed:manage";

const ROLE_RANK: Record<OrgMemberRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/** Minimum role required for each action. */
const ACTION_MIN_ROLE: Record<OrgAction, OrgMemberRole> = {
  "org:read": "member",
  "org:update": "admin",
  "org:delete": "owner",
  "members:read": "member",
  "members:invite": "admin",
  "members:update": "admin",
  "members:remove": "admin",
  "billing:read": "admin",
  "billing:manage": "owner",
  "api_keys:read": "admin",
  "api_keys:manage": "admin",
  "agents:read": "member",
  "agents:write": "admin",
  "agents:deploy": "admin",
  "conversations:read": "member",
  "usage:read": "member",
  "webhooks:manage": "admin",
  "embed:manage": "admin",
};

export function roleAtLeast(
  role: OrgMemberRole,
  minimum: OrgMemberRole,
): boolean {
  const roleRank = ROLE_RANK[role] ?? 0;
  const minRank = ROLE_RANK[minimum] ?? 0;
  return roleRank >= minRank;
}

/** Returns whether `role` is allowed to perform `action`. */
export function can(role: OrgMemberRole, action: OrgAction): boolean {
  const minimum = ACTION_MIN_ROLE[action];
  if (!minimum) {
    return false;
  }
  return roleAtLeast(role, minimum);
}

export function assertCan(role: OrgMemberRole, action: OrgAction): void {
  if (!can(role, action)) {
    throw new Error(`Forbidden: role "${role}" cannot perform "${action}"`);
  }
}
