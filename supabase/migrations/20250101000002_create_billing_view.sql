CREATE OR REPLACE VIEW billing_with_subscription
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.id AS user_id,
  p.stripe_customer_id,
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.current_period_end,
  s.current_period_start,
  s.cancel_at_period_end,
  s.canceled_at,
  s.items AS subscription_items,
  s.metadata AS subscription_metadata
FROM profiles p
LEFT JOIN stripe.subscriptions s ON s.customer = p.stripe_customer_id
WHERE p.id = (SELECT auth.uid());
