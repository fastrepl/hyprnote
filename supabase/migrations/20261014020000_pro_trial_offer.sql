-- Trial length depends on how the account signed up: referral and work (custom-domain)
-- emails get the long trial, personal emails the short one. Day counts live in
-- packages/pricing/src/trial-policy.json; this only classifies the caller.
CREATE FUNCTION public.get_pro_trial_offer()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM private.referral_invites AS referral
      WHERE referral.referred_user_id = auth.uid()
    ) THEN 'referral'
    WHEN private.email_auto_join_domain(auth.uid()) IS NOT NULL THEN 'work_email'
    ELSE 'personal_email'
  END;
$$;

REVOKE ALL ON FUNCTION public.get_pro_trial_offer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pro_trial_offer() TO authenticated;
