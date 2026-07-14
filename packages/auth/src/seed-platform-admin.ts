/**
 * Seed / upsert platform super-admin.
 * Prefer PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD from env.
 */
import "dotenv/config";
import { db, eq, user } from "@voiceify/db";
import { auth } from "./auth.js";

async function main() {
  const email = (
    process.env.PLATFORM_ADMIN_EMAIL ?? "admin@metapresence.co"
  ).toLowerCase();
  const password =
    process.env.PLATFORM_ADMIN_PASSWORD ?? "Admin1234???";
  const name = process.env.PLATFORM_ADMIN_NAME ?? "Platform Admin";

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existing.length) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });
    if (!result) {
      throw new Error("Failed to create admin user via Better Auth");
    }
    console.info(`[seed:admin] created ${email}`);
  } else {
    console.info(`[seed:admin] user exists ${email}`);
  }

  const [updated] = await db
    .update(user)
    .set({
      status: "approved",
      platformRole: "super_admin",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.email, email))
    .returning();

  if (!updated) throw new Error("Failed to promote admin user");
  console.info(
    `[seed:admin] promoted ${updated.email} → super_admin / approved`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
