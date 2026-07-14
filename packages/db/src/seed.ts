import "dotenv/config";
import { db } from "./client.js";
import { plans } from "./schema/orgs.js";

async function main() {
  const seeds = [
    {
      name: "Free",
      slug: "free",
      monthlyCredits: 5000,
      maxAgents: 3,
      maxMinutes: 100,
      priceCents: 0,
      features: { packs: true, embed: true },
    },
    {
      name: "Pro",
      slug: "pro",
      monthlyCredits: 50_000,
      maxAgents: 25,
      maxMinutes: 2000,
      priceCents: 14900,
      features: { packs: true, embed: true, webhooks: true },
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      monthlyCredits: 500_000,
      maxAgents: 500,
      maxMinutes: 50_000,
      priceCents: 0,
      features: { sso: true, custom: true },
    },
  ];

  for (const plan of seeds) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoNothing({ target: plans.slug });
  }
  console.info("[db:seed] plans upserted");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
