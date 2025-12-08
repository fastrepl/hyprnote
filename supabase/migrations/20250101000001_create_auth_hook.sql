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
    JOIN stripe.subscriptions s
      ON s.customer = p.stripe_customer_id
    WHERE p.id = (event->>'user_id')::uuid
      AND s.status IN ('active', 'trialing')
  ) INTO is_pro;

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

CREATE POLICY "Allow auth admin to read profiles"
ON public.profiles
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

GRANT USAGE ON SCHEMA stripe TO supabase_auth_admin;
GRANT SELECT ON TABLE stripe.subscriptions TO supabase_auth_admin;
