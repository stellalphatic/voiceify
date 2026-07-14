import { db, eq, user, type PlatformRole, type UserStatus } from "@voiceify/db";

export async function getPlatformUser(userId: string) {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export function isSuperAdmin(platformRole: PlatformRole | string | null | undefined) {
  return platformRole === "super_admin";
}

export async function requireSuperAdmin(userId: string) {
  const row = await getPlatformUser(userId);
  if (!row || !isSuperAdmin(row.platformRole)) {
    const err = new Error("Super admin access required");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return row;
}

export async function setUserStatus(userId: string, status: UserStatus) {
  const [row] = await db
    .update(user)
    .set({ status, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning();
  return row ?? null;
}
