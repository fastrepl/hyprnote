CREATE TABLE private.subscription_email_deliveries (
    delivery_key text PRIMARY KEY,
    payload jsonb NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    sent_at timestamptz
);
ALTER TABLE private.subscription_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.subscription_email_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON private.subscription_email_deliveries TO service_role;
