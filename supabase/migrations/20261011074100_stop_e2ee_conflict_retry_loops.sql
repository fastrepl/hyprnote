BEGIN;

CREATE OR REPLACE FUNCTION public.accept_e2ee_replica_batch(
  p_actor_user_id uuid, p_workspace_id uuid, p_mutation_id uuid,
  p_base_sequence bigint, p_initialize boolean, p_events jsonb
) RETURNS TABLE (initialized_at timestamptz, head_sequence bigint,
                 cloud_authority_after bigint, mutation_id uuid, receipts jsonb)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_workspace public.workspaces%ROWTYPE;
  v_key text;
  v_head bigint;
  v_hash text;
  v_receipt public.e2ee_replica_receipts%ROWTYPE;
  v_receipts jsonb;
BEGIN
  IF p_mutation_id IS NULL OR p_base_sequence IS NULL OR p_base_sequence < 0
     OR p_initialize IS NULL OR p_events IS NULL OR jsonb_typeof(p_events) <> 'array'
     OR jsonb_array_length(p_events) NOT BETWEEN 1 AND 1024 THEN
    RAISE EXCEPTION 'Invalid replica batch' USING ERRCODE = '22023';
  END IF;
  v_key := private.active_e2ee_freshness_key_id(p_actor_user_id, p_workspace_id);
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Replica access denied' USING ERRCODE = '42501';
  END IF;
  -- Receipt replays must survive an advanced head. Reject only new stale mutations here.
  IF NOT EXISTS (SELECT 1 FROM public.e2ee_replica_receipts
                 WHERE workspace_id = p_workspace_id AND e2ee_replica_receipts.mutation_id = p_mutation_id)
     AND (SELECT COALESCE(max(sequence), 0) FROM public.e2ee_freshness_events
          WHERE workspace_id = p_workspace_id) <> p_base_sequence THEN
    -- Preserve the API conflict code without triggering PostgREST's SQLSTATE 40001 retry loop.
    RAISE SQLSTATE 'PGRST' USING
      MESSAGE = '{"code":"40001","message":"Replica base changed; pull before retrying","details":null,"hint":null}',
      DETAIL = '{"status":409,"headers":{}}';
  END IF;
  PERFORM private.admit_e2ee_witness_write();
  SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id FOR UPDATE NOWAIT;
  v_key := private.active_e2ee_freshness_key_id(p_actor_user_id, p_workspace_id);
  IF v_workspace.id IS NULL OR v_key IS NULL THEN
    RAISE EXCEPTION 'Replica access denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_receipt FROM public.e2ee_replica_receipts
    WHERE workspace_id = p_workspace_id AND e2ee_replica_receipts.mutation_id = p_mutation_id;
  IF FOUND THEN
    v_hash := encode(extensions.digest(jsonb_build_array(p_base_sequence, p_initialize, p_events)::text, 'sha256'), 'hex');
    IF v_receipt.request_hash <> v_hash THEN
      RAISE EXCEPTION 'Mutation identity was reused' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT v_workspace.e2ee_freshness_initialized_at, v_receipt.accepted_head,
      v_workspace.e2ee_cloud_authority_after, p_mutation_id, v_receipt.events;
    RETURN;
  END IF;
  SELECT COALESCE(max(sequence), 0) INTO v_head FROM public.e2ee_freshness_events WHERE workspace_id = p_workspace_id;
  IF v_head <> p_base_sequence THEN
    -- Preserve the API conflict code without triggering PostgREST's SQLSTATE 40001 retry loop.
    RAISE SQLSTATE 'PGRST' USING
      MESSAGE = '{"code":"40001","message":"Replica base changed; pull before retrying","details":null,"hint":null}',
      DETAIL = '{"status":409,"headers":{}}';
  END IF;
  v_hash := encode(extensions.digest(jsonb_build_array(p_base_sequence, p_initialize, p_events)::text, 'sha256'), 'hex');
  IF v_workspace.e2ee_freshness_initialized_at IS NULL AND NOT p_initialize THEN
    RAISE EXCEPTION 'Replica requires established state' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_events) AS event(value)
    WHERE jsonb_typeof(event.value) <> 'object'
      OR COALESCE(event.value->>'record_id', '') !~ '^[A-Za-z0-9_-]{43}$'
      OR COALESCE(event.value->>'payload_hash', '') !~ '^[A-Za-z0-9_-]{43}$'
      OR octet_length(COALESCE(event.value->>'payload', '')) NOT BETWEEN 1 AND 16777216
      OR private.e2ee_freshness_payload_key_id(event.value->>'payload') IS NULL
      OR (v_workspace.kind::text = 'shared' AND private.e2ee_freshness_payload_key_id(event.value->>'payload') IS DISTINCT FROM v_key)
      OR event.value->>'payload_hash' <> rtrim(translate(encode(extensions.digest(event.value->>'payload', 'sha256'), 'base64'), '+/', '-_'), '=')
  ) OR (SELECT count(DISTINCT value->>'record_id') FROM jsonb_array_elements(p_events)) <> jsonb_array_length(p_events) THEN
    RAISE EXCEPTION 'Invalid replica event' USING ERRCODE = '22023';
  END IF;
  UPDATE public.workspaces SET
    e2ee_cloud_authority_after = COALESCE(e2ee_cloud_authority_after, v_head),
    e2ee_freshness_initialized_at = COALESCE(e2ee_freshness_initialized_at, now())
    WHERE id = p_workspace_id RETURNING * INTO v_workspace;
  WITH accepted AS (
    INSERT INTO public.e2ee_freshness_events(workspace_id, record_id, payload_hash, payload, created_by, protocol)
    SELECT p_workspace_id, value->>'record_id', value->>'payload_hash', value->>'payload', p_actor_user_id, 2
    FROM jsonb_array_elements(p_events)
    RETURNING sequence, record_id, payload_hash
  ) SELECT max(sequence), jsonb_agg(jsonb_build_object('sequence', sequence, 'recordId', record_id, 'payloadHash', payload_hash) ORDER BY sequence)
    INTO v_head, v_receipts FROM accepted;
  INSERT INTO public.e2ee_replica_receipts VALUES (p_workspace_id, p_mutation_id, v_hash, v_head, v_receipts);
  RETURN QUERY SELECT v_workspace.e2ee_freshness_initialized_at, v_head,
    v_workspace.e2ee_cloud_authority_after, p_mutation_id, v_receipts;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_e2ee_replica_batch(uuid, uuid, uuid, bigint, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_e2ee_replica_batch(uuid, uuid, uuid, bigint, boolean, jsonb) TO service_role;

COMMIT;
