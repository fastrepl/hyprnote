-- Encrypted records this build cannot apply yet (a table or column only a newer
-- client knows, or a record above the apply size limit) wait here instead of
-- failing the whole sync round. Startup requeues them so an upgraded build
-- gets another chance to apply them.
CREATE TABLE IF NOT EXISTS e2ee_parked_records (
  record_id    TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  reason       TEXT NOT NULL DEFAULT '',
  table_name   TEXT NOT NULL DEFAULT '',
  field_name   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_e2ee_parked_records_workspace
ON e2ee_parked_records(workspace_id, record_id);
