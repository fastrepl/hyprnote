-- Local content writes must restore a stale deletion before returning, including
-- while offline. Keep one restoration body for every content table.
CREATE VIEW session_deletion_conflicts AS
SELECT s.workspace_id, s.id AS session_id, s.deleted_at
FROM sessions AS s
WHERE s.deleted_at IS NOT NULL
  AND CASE WHEN json_valid(s.deletion_context) THEN
    json_extract(s.deletion_context, '$.version') = 1
    AND json_extract(s.deletion_context, '$.deletedAt') = s.deleted_at
    AND json_type(s.deletion_context, '$.observed') = 'object'
    AND EXISTS (
      SELECT 1 FROM session_content_observations AS content
      WHERE content.workspace_id = s.workspace_id AND content.session_id = s.id
        AND (content.deleted_at IS NULL OR content.deleted_at = s.deleted_at)
        AND NOT EXISTS (
          SELECT 1 FROM json_each(s.deletion_context, '$.observed') AS observed
          WHERE observed.key = content.content_id AND observed.value = content.content_version
        )
    )
  ELSE 0 END;

CREATE TRIGGER session_deletion_conflicts_restore
INSTEAD OF UPDATE OF deleted_at ON session_deletion_conflicts
WHEN NEW.deleted_at IS NULL AND NOT EXISTS (
  SELECT 1 FROM e2ee_apply_guard
  WHERE workspace_id = OLD.workspace_id AND table_name = 'sessions' AND row_id = OLD.session_id
)
BEGIN
  -- Preserve the deletion observation so later incoming child tombstones can
  -- still be reconciled against the same intent.
  INSERT INTO e2ee_apply_guard (workspace_id, table_name, row_id)
  VALUES (OLD.workspace_id, 'sessions', OLD.session_id);

  UPDATE sessions SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND id = OLD.session_id;

  UPDATE session_documents SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE transcripts SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE session_attachments SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE session_participants SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE session_tags SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE action_items SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND session_id = OLD.session_id
    AND deleted_at = OLD.deleted_at;

  UPDATE entity_mentions SET deleted_at = NULL
  WHERE workspace_id = OLD.workspace_id AND deleted_at = OLD.deleted_at
    AND ((source_type = 'session' AND source_id = OLD.session_id)
      OR (target_type = 'session' AND target_id = OLD.session_id));

  DELETE FROM e2ee_apply_guard
  WHERE workspace_id = OLD.workspace_id AND table_name = 'sessions' AND row_id = OLD.session_id;

  INSERT INTO e2ee_dirty_rows (workspace_id, table_name, row_id)
  VALUES (OLD.workspace_id, 'sessions', OLD.session_id)
  ON CONFLICT (workspace_id, table_name, row_id)
  DO UPDATE SET generation = generation + 1;
END;
