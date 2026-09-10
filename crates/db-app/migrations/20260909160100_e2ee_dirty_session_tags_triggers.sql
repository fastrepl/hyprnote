-- session_tags rows sync as part of the encrypted workspace. Rows written without
-- a workspace id take the device's workspace, as sessions do, so they publish.
CREATE TRIGGER IF NOT EXISTS e2ee_workspace_stamp_session_tags
AFTER INSERT ON session_tags
WHEN NEW.workspace_id = ''
BEGIN
  UPDATE session_tags
  SET workspace_id = COALESCE((
    SELECT json_extract(value_json, '$.workspace_id')
    FROM app_settings
    WHERE id = 'cloudsync_workspace_binding'
  ), '')
  WHERE id = NEW.id AND workspace_id = '';
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_session_tags_insert
AFTER INSERT ON session_tags
WHEN NOT EXISTS (
  SELECT 1
  FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id
    AND table_name = 'session_tags'
    AND row_id = NEW.id
)
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  VALUES (NEW.workspace_id, 'session_tags', NEW.id)
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_session_tags_update
AFTER UPDATE ON session_tags
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT OLD.workspace_id, 'session_tags', OLD.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = OLD.workspace_id
      AND table_name = 'session_tags'
      AND row_id = OLD.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;

  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT NEW.workspace_id, 'session_tags', NEW.id
  WHERE (NEW.workspace_id <> OLD.workspace_id OR NEW.id <> OLD.id)
    AND NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = NEW.workspace_id
      AND table_name = 'session_tags'
      AND row_id = NEW.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_session_tags_delete
AFTER DELETE ON session_tags
WHEN NOT EXISTS (
  SELECT 1
  FROM e2ee_apply_guard
  WHERE workspace_id = OLD.workspace_id
    AND table_name = 'session_tags'
    AND row_id = OLD.id
)
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  VALUES (OLD.workspace_id, 'session_tags', OLD.id)
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

-- Existing rows without a workspace take the device's workspace, and every row
-- is queued so the first sync after this update publishes it.
UPDATE session_tags
SET workspace_id = (
  SELECT json_extract(value_json, '$.workspace_id')
  FROM app_settings
  WHERE id = 'cloudsync_workspace_binding'
)
WHERE workspace_id = ''
  AND (
    SELECT json_extract(value_json, '$.workspace_id')
    FROM app_settings
    WHERE id = 'cloudsync_workspace_binding'
  ) IS NOT NULL;

INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
SELECT workspace_id, 'session_tags', id
FROM session_tags
WHERE true
ON CONFLICT (workspace_id, table_name, row_id) DO NOTHING;

INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
SELECT DISTINCT state.workspace_id, state.table_name, state.row_id
FROM e2ee_local_state AS state
WHERE state.table_name = 'session_tags'
  AND state.field_name = '$row'
  AND NOT EXISTS (
    SELECT 1
    FROM session_tags AS domain
    WHERE domain.workspace_id = state.workspace_id
      AND domain.id = state.row_id
  )
ON CONFLICT (workspace_id, table_name, row_id) DO NOTHING;
