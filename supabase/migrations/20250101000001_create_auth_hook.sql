CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_stripe_customer_id text;
  is_pro boolean := false;
BEGIN
  SELECT stripe_customer_id INTO user_stripe_customer_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  IF user_stripe_customer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM stripe.subscriptions s
      WHERE s.customer = user_stripe_customer_id
        AND s.status IN ('active', 'trialing')
    ) INTO is_pro;
  END IF;

  claims := event->'claims';
  claims := jsonb_set(claims, '{is_pro}', to_jsonb(is_pro));
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

GRANT USAGE ON SCHEMA stripe TO supabase_auth_admin;
GRANT SELECT ON TABLE stripe.subscriptions TO supabase_auth_admin;
