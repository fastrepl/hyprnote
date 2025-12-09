import { StripeSync } from "@supabase/stripe-sync-engine";

const { DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = Bun.env;

if (!DATABASE_URL || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing required environment variables");
}

const sync = new StripeSync({
  poolConfig: {
    connectionString: DATABASE_URL,
    max: 10,
  },
  schema: "stripe",
  stripeSecretKey: STRIPE_SECRET_KEY,
  stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
  autoExpandLists: true,
  backfillRelatedEntities: true,
});

console.log("Starting Stripe backfill...");
await sync.syncBackfill({ object: "all" });
console.log("Backfill complete.");
