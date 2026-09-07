CREATE TRIGGER sessions_restore_after_title_edit
AFTER UPDATE OF title ON sessions
WHEN NEW.title IS NOT OLD.title AND NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'sessions' AND row_id = NEW.id
)
BEGIN
  UPDATE session_deletion_conflicts SET deleted_at = NULL
  WHERE workspace_id = NEW.workspace_id AND session_id = NEW.id;
END;

