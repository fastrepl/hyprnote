CREATE OR REPLACE VIEW billing_with_subscription
WITH (security_invoker = true)
AS
SELECT p.*, s.*
FROM profiles p
LEFT JOIN stripe.subscriptions s ON s.customer = p.stripe_customer_id
WHERE p.id = (SELECT auth.uid());
