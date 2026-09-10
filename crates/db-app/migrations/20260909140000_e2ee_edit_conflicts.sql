-- Concurrent edits are ordered by when the local write happened, not by which
-- device published first. Dirty rows remember their write time, local state
-- remembers the edit time of the value it holds, and the value that loses a
-- concurrent edit is kept in e2ee_field_conflicts for the user instead of
-- being dropped.
ALTER TABLE e2ee_local_state ADD COLUMN edited_at_ms INTEGER;
ALTER TABLE e2ee_local_state ADD COLUMN republish INTEGER NOT NULL DEFAULT 0;
ALTER TABLE e2ee_dirty_rows ADD COLUMN dirtied_at_ms INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER IF NOT EXISTS e2ee_write_time_stamp_insert
AFTER INSERT ON e2ee_dirty_rows
BEGIN
  UPDATE e2ee_dirty_rows
  SET dirtied_at_ms = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  WHERE workspace_id = NEW.workspace_id
    AND table_name = NEW.table_name
    AND row_id = NEW.row_id;
END;

CREATE TRIGGER IF NOT EXISTS e2ee_write_time_stamp_update
AFTER UPDATE OF generation ON e2ee_dirty_rows
WHEN NEW.generation > OLD.generation
BEGIN
  UPDATE e2ee_dirty_rows
  SET dirtied_at_ms = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  WHERE workspace_id = NEW.workspace_id
    AND table_name = NEW.table_name
    AND row_id = NEW.row_id;
END;

DROP VIEW IF EXISTS e2ee_local_state_resolved;
CREATE VIEW e2ee_local_state_resolved AS
SELECT
  local.record_id,
  local.workspace_id,
  local.table_name,
  local.row_id,
  local.field_name,
  local.revision,
  local.writer_id,
  local.value_tag,
  local.payload_hash,
  CASE
    WHEN replica.workspace_id = local.workspace_id
      AND replica_hash.payload_hash = local.payload_hash
      THEN replica.payload
    ELSE archive.payload
  END AS payload,
  local.updated_at,
  local.edited_at_ms,
  local.republish
FROM e2ee_local_state AS local
LEFT JOIN e2ee_records AS replica
  ON replica.id = local.record_id
LEFT JOIN e2ee_replica_payload_hashes AS replica_hash
  ON replica_hash.record_id = replica.id
 AND replica_hash.workspace_id = replica.workspace_id
LEFT JOIN e2ee_ciphertext_archive AS archive
  ON archive.workspace_id = local.workspace_id
 AND archive.record_id = local.record_id
 AND archive.payload_hash = local.payload_hash;

CREATE TABLE IF NOT EXISTS e2ee_field_conflicts (
  id            TEXT PRIMARY KEY NOT NULL,
  workspace_id  TEXT NOT NULL DEFAULT '',
  table_name    TEXT NOT NULL DEFAULT '',
  row_id        TEXT NOT NULL DEFAULT '',
  field_name    TEXT NOT NULL DEFAULT '',
  lost_side     TEXT NOT NULL DEFAULT '',
  writer_id     TEXT NOT NULL DEFAULT '',
  revision      INTEGER NOT NULL DEFAULT 0,
  edited_at_ms  INTEGER,
  value_json    TEXT NOT NULL DEFAULT 'null',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at   TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS idx_e2ee_field_conflicts_row
ON e2ee_field_conflicts(workspace_id, table_name, row_id, resolved_at);
