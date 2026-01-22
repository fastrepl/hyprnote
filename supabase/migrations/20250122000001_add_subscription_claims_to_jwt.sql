-- Add subscription status and trial information to JWT claims
-- This allows the desktop app to distinguish between trial and paid pro users

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  entitlements jsonb := '[]'::jsonb;
  subscription_status text := 'none';
  trial_end_ts bigint := NULL;
  user_stripe_customer_id text;
BEGIN
  -- Get user's stripe customer ID
  SELECT stripe_customer_id INTO user_stripe_customer_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Get entitlements
  SELECT
    COALESCE(
      jsonb_agg(ae.lookup_key ORDER BY ae.lookup_key)
        FILTER (WHERE ae.lookup_key IS NOT NULL),
      '[]'::jsonb
    )
  INTO entitlements
  FROM stripe.active_entitlements ae
  WHERE ae.customer = user_stripe_customer_id;

  -- Get subscription status and trial end date if exists
  IF user_stripe_customer_id IS NOT NULL THEN
    SELECT
      s.status,
      (s.trial_end #>> '{}')::bigint
    INTO subscription_status, trial_end_ts
    FROM stripe.subscriptions s
    WHERE s.customer = user_stripe_customer_id
      AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created DESC
    LIMIT 1;

    -- If no active subscription found, set status to 'none'
    IF subscription_status IS NULL THEN
      subscription_status := 'none';
    END IF;
  END IF;

  -- Build claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{entitlements}', entitlements);
  claims := jsonb_set(claims, '{subscription_status}', to_jsonb(subscription_status));

  -- Only add trial_end if it exists
  IF trial_end_ts IS NOT NULL THEN
    claims := jsonb_set(claims, '{trial_end}', to_jsonb(trial_end_ts));
  END IF;

  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant necessary permissions for the new subscription query
GRANT SELECT ON TABLE stripe.subscriptions TO supabase_auth_admin;

CREATE POLICY "Allow auth admin to read subscriptions"
ON stripe.subscriptions
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);
