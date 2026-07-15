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

function parseTrustedOrigins(baseURL: string): string[] {
  const fromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const web = process.env.WEB_ORIGIN?.trim();
  const origins = new Set<string>([baseURL, ...fromEnv]);
  if (web) origins.add(web);
  // Local / IP testing without TLS
  origins.add("http://localhost:5173");
  origins.add("http://127.0.0.1:5173");
  origins.add("http://localhost:8080");
  return [...origins];
}

/**
 * Better Auth instance sharing @voiceify/db tables.
 * Organizations use custom helpers in `./org.ts`.
 * Platform fields: status (pending|approved|rejected|suspended), platformRole.
 */
export function createAuth() {
  const autoApprove = process.env.AUTO_APPROVE_SIGNUPS === "true";
  const platformAdminEmail = (
    process.env.PLATFORM_ADMIN_EMAIL ?? "admin@metapresence.co"
  ).toLowerCase();
  const baseURL = requireEnv("BETTER_AUTH_URL").replace(/\/$/, "");
  const isHttps = baseURL.startsWith("https://");

  return betterAuth({
    baseURL,
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
      minPasswordLength: 8,
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
            const email = String(data.email ?? "").toLowerCase();
            const isPlatformAdmin = email === platformAdminEmail;
            return {
              data: {
                ...data,
                status:
                  isPlatformAdmin || autoApprove ? "approved" : "pending",
                platformRole: isPlatformAdmin ? "super_admin" : "user",
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
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    trustedOrigins: parseTrustedOrigins(baseURL),
    advanced: {
      // Caddy terminates TLS; force Secure cookies in production HTTPS deploys
      useSecureCookies: isHttps || process.env.NODE_ENV === "production",
      trustedProxyHeaders: true,
      defaultCookieAttributes: {
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        secure: isHttps || process.env.NODE_ENV === "production",
      },
    },
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
