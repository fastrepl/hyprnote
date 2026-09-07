-- The Customer Analytics signup action must combine account_created before
-- 2026-09-05 07:00:00Z with account_created_anonymous from that point onward.
-- Replacing the entire cutover day avoids overlap with its partially delivered
-- legacy events. No account identifier is retained or exported by this queue.
CREATE TABLE private.signup_analytics_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL,
  lease_id uuid,
  lease_expires_at timestamptz
);

ALTER TABLE private.signup_analytics_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.signup_analytics_outbox
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.record_anonymous_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE(NEW.is_anonymous, false)
    AND NEW.created_at >= '2026-09-05 07:00:00+00'::timestamptz
    AND COALESCE(NEW.email, '') !~* '(hyprnote\.com|anarlog\.so|fastrepl\.com)'
  THEN
    -- Hour precision preserves daily counts without exporting exact signup times.
    INSERT INTO private.signup_analytics_outbox (occurred_at)
    VALUES (date_trunc('hour', NEW.created_at, 'UTC'));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_anonymous_signup()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.record_anonymous_signup()
  TO supabase_auth_admin;

-- Serialize trigger installation and backfill with signups so every committed
-- registration is counted once, including signups arriving during deployment.
LOCK TABLE auth.users IN SHARE ROW EXCLUSIVE MODE;
CREATE TRIGGER on_auth_user_anonymous_signup_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.record_anonymous_signup();

INSERT INTO private.signup_analytics_outbox (occurred_at)
SELECT date_trunc('hour', account.created_at, 'UTC')
FROM auth.users AS account
WHERE NOT COALESCE(account.is_anonymous, false)
  AND account.created_at >= '2026-09-05 07:00:00+00'::timestamptz
  AND COALESCE(account.email, '') !~* '(hyprnote\.com|anarlog\.so|fastrepl\.com)';

CREATE OR REPLACE FUNCTION public.claim_signup_analytics_events(p_lease_id uuid)
RETURNS TABLE (id uuid, occurred_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_lease_id IS NULL THEN
    RAISE EXCEPTION 'invalid signup analytics lease' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT outbox.id
    FROM private.signup_analytics_outbox AS outbox
    WHERE outbox.lease_expires_at IS NULL OR outbox.lease_expires_at <= v_now
    ORDER BY outbox.occurred_at, outbox.id
    FOR UPDATE SKIP LOCKED
    LIMIT 500
  )
  UPDATE private.signup_analytics_outbox AS outbox
  SET lease_id = p_lease_id, lease_expires_at = v_now + interval '5 minutes'
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING outbox.id, outbox.occurred_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_signup_analytics_events(p_lease_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_lease_id IS NULL THEN
    RAISE EXCEPTION 'invalid signup analytics lease' USING ERRCODE = '22023';
  END IF;

  DELETE FROM private.signup_analytics_outbox WHERE lease_id = p_lease_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_signup_analytics_events(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_signup_analytics_events(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_signup_analytics_events(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_signup_analytics_events(uuid)
  TO service_role;
