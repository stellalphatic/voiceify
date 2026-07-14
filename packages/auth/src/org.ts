import {
  db,
  eq,
  and,
  orgMembers,
  organizations,
  type OrgMember,
  type OrgMemberRole,
  type Organization,
} from "@voiceify/db";

export class OrgAccessError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "OrgAccessError";
    this.status = status;
  }
}

export type OrgMembership = {
  member: OrgMember;
  organization: Organization;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base.length > 0 ? base : "org";
}

async function uniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base}${suffix}`;
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Require that `userId` is a member of `orgId`.
 * Throws OrgAccessError(404) when missing so cross-tenant probes do not leak existence.
 */
export async function requireOrgMember(
  userId: string,
  orgId: string,
): Promise<OrgMembership> {
  const rows = await db
    .select({
      member: orgMembers,
      organization: organizations,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new OrgAccessError("Organization not found", 404);
  }
  return row;
}

export async function listUserOrgs(userId: string): Promise<OrgMembership[]> {
  return db
    .select({
      member: orgMembers,
      organization: organizations,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));
}

export type CreateOrgInput = {
  name: string;
  slug?: string;
  ownerUserId: string;
  planId?: string | null;
};

export async function createOrgWithOwner(
  input: CreateOrgInput,
): Promise<OrgMembership> {
  const name = input.name.trim();
  if (!name) {
    throw new OrgAccessError("Organization name is required", 400);
  }

  const slug = input.slug?.trim() || (await uniqueOrgSlug(name));

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name,
        slug,
        planId: input.planId ?? null,
        creditBalanceCents: 0,
      })
      .returning();

    if (!organization) {
      throw new OrgAccessError("Failed to create organization", 500);
    }

    const role: OrgMemberRole = "owner";
    const [member] = await tx
      .insert(orgMembers)
      .values({
        orgId: organization.id,
        userId: input.ownerUserId,
        role,
      })
      .returning();

    if (!member) {
      throw new OrgAccessError("Failed to create organization owner", 500);
    }

    return { member, organization };
  });
}
