/**
 * Seed / upsert platform super-admin.
 * Prefer PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD from env.
 *
 * Always syncs password from env so changing PLATFORM_ADMIN_PASSWORD
 * on the server actually works after re-running seed:admin.
 */
import "dotenv/config";
import { account, and, db, eq, user } from "@voiceify/db";
import { hashPassword } from "better-auth/crypto";
import { auth } from "./auth.js";

async function main() {
  const email = (
    process.env.PLATFORM_ADMIN_EMAIL ?? "admin@metapresence.co"
  ).toLowerCase();
  const password =
    process.env.PLATFORM_ADMIN_PASSWORD ?? "Admin1234???";
  const name = process.env.PLATFORM_ADMIN_NAME ?? "Platform Admin";

  if (password.length < 8) {
    throw new Error("PLATFORM_ADMIN_PASSWORD must be at least 8 characters");
  }

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existing.length) {
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
      });
      if (result) {
        console.info(`[seed:admin] created ${email}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const [createdAnyway] = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      if (!createdAnyway) {
        throw new Error(`Failed to create admin user: ${msg}`);
      }
      console.info(
        `[seed:admin] user row created (session hook blocked); continuing`,
      );
    }
  } else {
    console.info(`[seed:admin] user exists ${email}`);
  }

  const [updated] = await db
    .update(user)
    .set({
      status: "approved",
      platformRole: "super_admin",
      emailVerified: true,
      name,
      updatedAt: new Date(),
    })
    .where(eq(user.email, email))
    .returning();

  if (!updated) throw new Error("Failed to promote admin user");

  // Keep credential password in sync with env (admin login breaks without this)
  const hashed = await hashPassword(password);
  const credentialAccounts = await db
    .select()
    .from(account)
    .where(
      and(eq(account.userId, updated.id), eq(account.providerId, "credential")),
    )
    .limit(1);

  if (credentialAccounts.length) {
    await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(account.id, credentialAccounts[0]!.id));
    console.info(`[seed:admin] password synced from PLATFORM_ADMIN_PASSWORD`);
  } else {
    const id = crypto.randomUUID();
    await db.insert(account).values({
      id,
      accountId: updated.id,
      providerId: "credential",
      userId: updated.id,
      password: hashed,
    });
    console.info(`[seed:admin] credential account created`);
  }

  console.info(
    `[seed:admin] ready ${updated.email} → super_admin / approved`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
