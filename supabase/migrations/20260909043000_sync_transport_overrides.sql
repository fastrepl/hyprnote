BEGIN;

SET LOCAL lock_timeout = '30s';

-- Per-account desktop transport pins read by the API when issuing /sync/token.
-- Operators insert rows to move individual accounts onto the witness-only
-- replica transport (or pin them back to sqlite-sync) without a client release.
CREATE TABLE public.sync_transport_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  transport text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sync_transport_overrides_transport_check CHECK (
    transport IN ('replica', 'sqlite_sync')
  )
);

ALTER TABLE public.sync_transport_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sync_transport_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sync_transport_overrides TO service_role;

COMMIT;
