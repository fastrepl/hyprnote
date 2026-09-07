ALTER TABLE sessions ADD COLUMN deletion_context TEXT NOT NULL DEFAULT '';

-- Capture what this device deleted, including children tombstoned earlier in
-- the same transaction. Incoming deletions carry the sender's observations.
CREATE TRIGGER sessions_deletion_context
AFTER UPDATE OF deleted_at ON sessions
WHEN NEW.deleted_at IS NOT OLD.deleted_at AND NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'sessions' AND row_id = NEW.id
)
BEGIN
  UPDATE sessions SET deletion_context = CASE WHEN NEW.deleted_at IS NULL THEN ''
    ELSE json_object('version', 1, 'deletedAt', NEW.deleted_at, 'observed', json((
      SELECT json_group_object(content_id, content_version)
      FROM session_content_observations
      WHERE session_id = NEW.id AND workspace_id = NEW.workspace_id
        AND (deleted_at IS NULL OR deleted_at = NEW.deleted_at)
    ))) END
  WHERE id = NEW.id;
END;

-- The nested observation write is bookkeeping; the original content write
-- already queues encryption and search exactly once.

DROP TRIGGER search_index_sessions_update;
CREATE TRIGGER IF NOT EXISTS search_index_sessions_update
AFTER UPDATE ON sessions
WHEN NEW.deletion_context IS OLD.deletion_context OR NEW.deleted_at IS NOT OLD.deleted_at OR NEW.title IS NOT OLD.title OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.id IS NOT OLD.id
BEGIN
  INSERT INTO search_index_dirty (entity_type, entity_id)
  VALUES ('session', OLD.id)
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    generation = search_index_dirty.generation + 1,
    queued_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

  INSERT INTO search_index_dirty (entity_type, entity_id)
  SELECT 'session', NEW.id
  WHERE NEW.id <> OLD.id
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    generation = search_index_dirty.generation + 1,
    queued_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;

DROP TRIGGER e2ee_dirty_sessions_update;
CREATE TRIGGER IF NOT EXISTS e2ee_dirty_sessions_update
AFTER UPDATE ON sessions
WHEN NEW.deletion_context IS OLD.deletion_context OR NEW.deleted_at IS NOT OLD.deleted_at OR NEW.title IS NOT OLD.title OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.id IS NOT OLD.id
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT OLD.workspace_id, 'sessions', OLD.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = OLD.workspace_id
      AND table_name = 'sessions'
      AND row_id = OLD.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;

  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT NEW.workspace_id, 'sessions', NEW.id
  WHERE (NEW.workspace_id <> OLD.workspace_id OR NEW.id <> OLD.id)
    AND NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = NEW.workspace_id
      AND table_name = 'sessions'
      AND row_id = NEW.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;
