-- Restore the account-event feed removed by the privacy cleanup. The previous
-- queue was erased, so reconciliation starts strictly after the last delivered
-- signup/confirmation source timestamps instead of replaying existing history.
CREATE OR REPLACE FUNCTION private.enqueue_account_analytics_event(
  p_event_name text,
  p_user_id uuid,
  p_occurred_at timestamptz,
  p_email text,
  p_auth_provider text,
  p_historical boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  person_properties jsonb;
BEGIN
  IF p_event_name NOT IN ('account_created', 'account_confirmed')
    OR p_user_id IS NULL
    OR p_occurred_at IS NULL
  THEN
    RAISE EXCEPTION 'invalid account analytics event'
      USING ERRCODE = '22023';
  END IF;

  person_properties := jsonb_strip_nulls(
    jsonb_build_object(
      'email',
      p_email,
      CASE
        WHEN p_event_name = 'account_created' THEN 'account_created_at'
        ELSE 'account_confirmed_at'
      END,
      p_occurred_at
    )
  );

  INSERT INTO private.account_analytics_outbox (
    event_name,
    user_id,
    occurred_at,
    email,
    properties,
    historical
  )
  VALUES (
    p_event_name,
    p_user_id,
    p_occurred_at,
    p_email,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source',
        'supabase_auth',
        'auth_provider',
        p_auth_provider,
        '$set',
        person_properties
      )
    ),
    p_historical
  )
  ON CONFLICT (event_name, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_account_analytics_events()
RETURNS TABLE (
  source_accounts bigint,
  source_confirmed_accounts bigint,
  queued_account_created bigint,
  queued_account_confirmed bigint,
  pending_events bigint,
  delivered_events bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.enqueue_account_analytics_event(
    'account_created',
    account.id,
    account.created_at,
    account.email,
    COALESCE(account.raw_app_meta_data ->> 'provider', 'unknown'),
    account.created_at < clock_timestamp() - interval '10 minutes'
  )
  FROM auth.users AS account
  WHERE COALESCE(account.is_anonymous, false) = false
    AND account.created_at > '2026-09-05 08:21:56.481221+00'::timestamptz;

  PERFORM private.enqueue_account_analytics_event(
    'account_confirmed',
    account.id,
    confirmation.occurred_at,
    account.email,
    COALESCE(account.raw_app_meta_data ->> 'provider', 'unknown'),
    confirmation.occurred_at < clock_timestamp() - interval '10 minutes'
  )
  FROM auth.users AS account
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      account.confirmed_at,
      account.email_confirmed_at,
      account.phone_confirmed_at
    ) AS occurred_at
  ) AS confirmation
  WHERE COALESCE(account.is_anonymous, false) = false
    AND confirmation.occurred_at > '2026-09-05 08:21:56.534471+00'::timestamptz;

  RETURN QUERY
  SELECT
    (
      SELECT count(*)
      FROM auth.users AS account
      WHERE COALESCE(account.is_anonymous, false) = false
    ),
    (
      SELECT count(*)
      FROM auth.users AS account
      WHERE COALESCE(account.is_anonymous, false) = false
        AND COALESCE(
          account.confirmed_at,
          account.email_confirmed_at,
          account.phone_confirmed_at
        ) IS NOT NULL
    ),
    count(*) FILTER (WHERE outbox.event_name = 'account_created'),
    count(*) FILTER (WHERE outbox.event_name = 'account_confirmed'),
    count(*) FILTER (WHERE outbox.delivered_at IS NULL),
    count(*) FILTER (WHERE outbox.delivered_at IS NOT NULL)
  FROM private.account_analytics_outbox AS outbox;
END;
$$;

DO $$
BEGIN
  LOCK TABLE auth.users IN SHARE ROW EXCLUSIVE MODE;
  DROP TRIGGER IF EXISTS on_auth_user_account_analytics_created ON auth.users;
  CREATE TRIGGER on_auth_user_account_analytics_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION private.handle_account_analytics_user();

  DROP TRIGGER IF EXISTS on_auth_user_account_analytics_confirmed ON auth.users;
  CREATE TRIGGER on_auth_user_account_analytics_confirmed
    AFTER UPDATE OF confirmed_at, email_confirmed_at, phone_confirmed_at
    ON auth.users
    FOR EACH ROW
    WHEN (
      COALESCE(
        OLD.confirmed_at,
        OLD.email_confirmed_at,
        OLD.phone_confirmed_at
      ) IS NULL
      AND COALESCE(
        NEW.confirmed_at,
        NEW.email_confirmed_at,
        NEW.phone_confirmed_at
      ) IS NOT NULL
    )
    EXECUTE FUNCTION private.handle_account_analytics_user();

  PERFORM public.reconcile_account_analytics_events();
END;
$$;
