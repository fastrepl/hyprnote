import { StripeSync } from "@supabase/stripe-sync-engine";

import { env } from "../env";

export const stripeSync = new StripeSync({
  schema: "stripe",
  poolConfig: { connectionString: env.DATABASE_URL },
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  backfillRelatedEntities: true,
});
