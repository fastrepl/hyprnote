-- Cloud API access checked only the user's own Stripe customer, so members
-- whose Pro comes from a paid workspace seat were refused with
-- subscription_required even though the access token hook already grants them
-- the hyprnote_pro entitlement. Mirror the hook: a personal entitlement or
-- trial, or an entitlement or trial on any workspace the user belongs to.
CREATE OR REPLACE FUNCTION private.cloud_api_user_has_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN stripe.active_entitlements AS entitlement
        ON entitlement.customer = profile.stripe_customer_id
      WHERE profile.id = p_user_id
        AND entitlement.lookup_key = 'hyprnote_pro'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN stripe.subscriptions AS subscription
        ON subscription.customer = profile.stripe_customer_id
      WHERE profile.id = p_user_id
        AND subscription.status = 'trialing'
        AND (subscription.trial_end #>> '{}')::bigint
          > extract(epoch FROM now())::bigint
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspace_memberships AS membership
      JOIN public.workspaces AS workspace
        ON workspace.id = membership.workspace_id
      JOIN stripe.active_entitlements AS entitlement
        ON entitlement.customer = workspace.stripe_customer_id
      WHERE membership.user_id = p_user_id
        AND membership.deleted_at IS NULL
        AND workspace.deleted_at IS NULL
        AND workspace.stripe_customer_id IS NOT NULL
        AND entitlement.lookup_key = 'hyprnote_pro'
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspace_memberships AS membership
      JOIN public.workspaces AS workspace
        ON workspace.id = membership.workspace_id
      JOIN stripe.subscriptions AS subscription
        ON subscription.customer = workspace.stripe_customer_id
      WHERE membership.user_id = p_user_id
        AND membership.deleted_at IS NULL
        AND workspace.deleted_at IS NULL
        AND workspace.stripe_customer_id IS NOT NULL
        AND subscription.status = 'trialing'
        AND (subscription.trial_end #>> '{}')::bigint
          > extract(epoch FROM now())::bigint
    );
$$;

REVOKE ALL ON FUNCTION private.cloud_api_user_has_pro(uuid)
  FROM PUBLIC, anon, authenticated;
