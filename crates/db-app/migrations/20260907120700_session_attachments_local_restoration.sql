CREATE TRIGGER session_attachments_restore_session_insert
AFTER INSERT ON session_attachments
WHEN NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'session_attachments' AND row_id = NEW.id
)
BEGIN
  UPDATE session_deletion_conflicts SET deleted_at = NULL
  WHERE workspace_id = NEW.workspace_id AND session_id = NEW.session_id;
END;

CREATE TRIGGER session_attachments_restore_session_update
AFTER UPDATE OF sha256, size_bytes, relative_path, source_type, source_id ON session_attachments
WHEN NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'session_attachments' AND row_id = NEW.id
)
BEGIN
  UPDATE session_deletion_conflicts SET deleted_at = NULL
  WHERE workspace_id = NEW.workspace_id AND session_id = NEW.session_id;
END;

