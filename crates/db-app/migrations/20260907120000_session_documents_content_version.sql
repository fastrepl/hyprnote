ALTER TABLE session_documents ADD COLUMN content_version TEXT NOT NULL DEFAULT '';

-- This identifies content the user has seen when deleting. Replicated fields
-- keep their originating version; tombstones and transfer metadata do not edit it.
CREATE TRIGGER session_documents_content_version_insert
AFTER INSERT ON session_documents
WHEN NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'session_documents' AND row_id = NEW.id
)
BEGIN
  UPDATE session_documents SET content_version = lower(hex(randomblob(16))) WHERE id = NEW.id;
END;

CREATE TRIGGER session_documents_content_version_update
AFTER UPDATE OF body, body_format ON session_documents
WHEN (NEW.body IS NOT OLD.body OR NEW.body_format IS NOT OLD.body_format)
  AND NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'session_documents' AND row_id = NEW.id
)
BEGIN
  UPDATE session_documents SET content_version = lower(hex(randomblob(16))) WHERE id = NEW.id;
END;


-- The nested observation write is bookkeeping; the original content write
-- already queues encryption and search exactly once.

DROP TRIGGER search_index_session_documents_update;
CREATE TRIGGER IF NOT EXISTS search_index_session_documents_update
AFTER UPDATE ON session_documents
WHEN NEW.content_version IS OLD.content_version OR NEW.body IS NOT OLD.body OR NEW.body_format IS NOT OLD.body_format OR NEW.session_id IS NOT OLD.session_id OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.id IS NOT OLD.id
BEGIN
  INSERT INTO search_index_dirty (entity_type, entity_id)
  SELECT 'session', OLD.session_id
  WHERE OLD.session_id <> ''
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    generation = search_index_dirty.generation + 1,
    queued_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

  INSERT INTO search_index_dirty (entity_type, entity_id)
  SELECT 'session', NEW.session_id
  WHERE NEW.session_id <> '' AND NEW.session_id <> OLD.session_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    generation = search_index_dirty.generation + 1,
    queued_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
END;

DROP TRIGGER e2ee_dirty_session_documents_update;
CREATE TRIGGER IF NOT EXISTS e2ee_dirty_session_documents_update
AFTER UPDATE ON session_documents
WHEN NEW.content_version IS OLD.content_version OR NEW.body IS NOT OLD.body OR NEW.body_format IS NOT OLD.body_format OR NEW.session_id IS NOT OLD.session_id OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.id IS NOT OLD.id
BEGIN
  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT OLD.workspace_id, 'session_documents', OLD.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = OLD.workspace_id
      AND table_name = 'session_documents'
      AND row_id = OLD.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;

  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  SELECT NEW.workspace_id, 'session_documents', NEW.id
  WHERE (NEW.workspace_id <> OLD.workspace_id OR NEW.id <> OLD.id)
    AND NOT EXISTS (
    SELECT 1
    FROM e2ee_apply_guard
    WHERE workspace_id = NEW.workspace_id
      AND table_name = 'session_documents'
      AND row_id = NEW.id
  )
  ON CONFLICT (workspace_id, table_name, row_id) DO UPDATE SET
    generation = e2ee_dirty_rows.generation + 1;
END;
