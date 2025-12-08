ALTER TABLE "billings" DROP COLUMN IF EXISTS "stripe_customer";
ALTER TABLE "billings" DROP COLUMN IF EXISTS "stripe_subscription";
ALTER TABLE "billings" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

CREATE INDEX IF NOT EXISTS "billings_stripe_customer_id_idx" ON "billings" ("stripe_customer_id");
