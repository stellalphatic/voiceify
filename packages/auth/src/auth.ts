import {
  account,
  getDb,
  session,
  user,
  verification,
} from "@voiceify/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

function requireEnv(name: "BETTER_AUTH_URL" | "BETTER_AUTH_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

/**
 * Better Auth instance sharing @voiceify/db tables.
 * Organizations use custom helpers in `./org.ts`.
 * Platform fields: status (pending|approved|rejected|suspended), platformRole.
 */
export function createAuth() {
  const autoApprove = process.env.AUTO_APPROVE_SIGNUPS === "true";

  return betterAuth({
    baseURL: requireEnv("BETTER_AUTH_URL"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        status: {
          type: "string",
          required: false,
          defaultValue: autoApprove ? "approved" : "pending",
          input: false,
        },
        platformRole: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            return {
              data: {
                ...data,
                status: autoApprove ? "approved" : "pending",
                platformRole: "user",
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (sessionData) => {
            const db = getDb();
            const [row] = await db
              .select({
                status: user.status,
                platformRole: user.platformRole,
              })
              .from(user)
              .where(eq(user.id, sessionData.userId))
              .limit(1);

            if (!row) {
              throw new Error("User not found");
            }
            if (row.status === "pending") {
              throw new Error(
                "Your account is pending admin approval. Please wait for Voiceify to approve your signup.",
              );
            }
            if (row.status === "rejected") {
              throw new Error("Your account request was rejected.");
            }
            if (row.status === "suspended") {
              throw new Error("Your account has been suspended. Contact support.");
            }
            return { data: sessionData };
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim())
      : undefined,
  });
}

let _auth: ReturnType<typeof createAuth> | undefined;

/** Lazily constructed so importing the package does not require env until use. */
export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get(_target, prop, receiver) {
    if (!_auth) {
      _auth = createAuth();
    }
    return Reflect.get(_auth, prop, receiver);
  },
});

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
