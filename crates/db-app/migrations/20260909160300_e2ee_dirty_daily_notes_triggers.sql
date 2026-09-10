-- daily_notes rows sync as part of the encrypted workspace. Rows written without
-- a workspace id take the device's workspace, as sessions do, so they publish.
CREATE TRIGGER IF NOT EXISTS e2ee_workspace_stamp_daily_notes
AFTER INSERT ON daily_notes
WHEN NEW.workspace_id = ''
BEGIN
  UPDATE daily_notes
  SET workspace_id = COALESCE((
    SELECT json_extract(value_json, '$.workspace_id')
    FROM app_settings
    WHERE id = 'cloudsync_workspace_binding'
  ), '')
  WHERE id = NEW.id AND workspace_id = '';
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_daily_notes_insert
AFTER INSERT ON daily_notes
WHEN NOT EXISTS (
  SELECT 1
  FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id
    AND table_name = 'daily_notes'
    AND row_id = NEW.id
)
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  VALUES (NEW.workspace_id, 'daily_notes', NEW.id)
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_daily_notes_update
AFTER UPDATE ON daily_notes
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT OLD.workspace_id, 'daily_notes', OLD.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = OLD.workspace_id
      AND table_name = 'daily_notes'
      AND row_id = OLD.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;

  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT NEW.workspace_id, 'daily_notes', NEW.id
  WHERE (NEW.workspace_id <> OLD.workspace_id OR NEW.id <> OLD.id)
    AND NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = NEW.workspace_id
      AND table_name = 'daily_notes'
      AND row_id = NEW.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

CREATE TRIGGER IF NOT EXISTS e2ee_dirty_daily_notes_delete
AFTER DELETE ON daily_notes
WHEN NOT EXISTS (
  SELECT 1
  FROM e2ee_apply_guard
  WHERE workspace_id = OLD.workspace_id
    AND table_name = 'daily_notes'
    AND row_id = OLD.id
)
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  VALUES (OLD.workspace_id, 'daily_notes', OLD.id)
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;

-- Existing rows without a workspace take the device's workspace, and every row
-- is queued so the first sync after this update publishes it.
UPDATE daily_notes
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
SELECT workspace_id, 'daily_notes', id
FROM daily_notes
WHERE true
ON CONFLICT (workspace_id, table_name, row_id) DO NOTHING;

INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
SELECT DISTINCT state.workspace_id, state.table_name, state.row_id
FROM e2ee_local_state AS state
WHERE state.table_name = 'daily_notes'
  AND state.field_name = '$row'
  AND NOT EXISTS (
    SELECT 1
    FROM daily_notes AS domain
    WHERE domain.workspace_id = state.workspace_id
      AND domain.id = state.row_id
  )
ON CONFLICT (workspace_id, table_name, row_id) DO NOTHING;
