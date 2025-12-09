-- Update custom_access_token_hook to use Stripe Entitlements instead of subscription status.
-- This is more robust as it checks for specific feature entitlements rather than any active subscription.
-- Requires creating a Feature in Stripe Dashboard with lookup_key = 'pro' and attaching it to your Pro product.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  is_pro boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN stripe.active_entitlements ae
      ON ae.customer = p.stripe_customer_id
    WHERE p.id = (event->>'user_id')::uuid
      AND ae.lookup_key = 'pro'
  ) INTO is_pro;

  claims := event->'claims';
  claims := jsonb_set(claims, '{is_pro}', to_jsonb(is_pro));
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

GRANT SELECT ON TABLE stripe.active_entitlements TO supabase_auth_admin;
