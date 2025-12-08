CREATE OR REPLACE VIEW billing_with_subscription AS
SELECT
  b.id,
  b.user_id,
  b.stripe_customer_id,
  b.created_at,
  b.updated_at,
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.current_period_end,
  s.current_period_start,
  s.cancel_at_period_end,
  s.canceled_at,
  s.items AS subscription_items,
  s.metadata AS subscription_metadata
FROM billings b
LEFT JOIN stripe.subscriptions s ON s.customer = b.stripe_customer_id;

COMMENT ON VIEW billing_with_subscription IS 'View that joins billings with stripe subscriptions for client queries';
