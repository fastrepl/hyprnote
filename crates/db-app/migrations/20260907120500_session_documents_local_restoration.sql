-- Content versions are assigned after both local inserts and content edits.
-- Waiting for that write avoids depending on sibling trigger execution order.
CREATE TRIGGER session_documents_restore_session
AFTER UPDATE OF content_version ON session_documents
WHEN NEW.content_version IS NOT OLD.content_version AND NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = NEW.workspace_id AND table_name = 'session_documents' AND row_id = NEW.id
)
BEGIN
  UPDATE session_deletion_conflicts SET deleted_at = NULL
  WHERE workspace_id = NEW.workspace_id AND session_id = NEW.session_id;
END;

