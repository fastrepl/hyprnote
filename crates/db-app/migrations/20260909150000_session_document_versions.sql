-- Keeps earlier bodies of a note so the user can go back to one. A version is
-- the body that was replaced by a write; local writes within ten minutes of
-- the previous local snapshot are one editing session and do not add another
-- version. Writes applied by sync are marked so history shows which device's
-- edit replaced what.
CREATE TABLE IF NOT EXISTS session_document_versions (
  id            TEXT PRIMARY KEY NOT NULL,
  workspace_id  TEXT NOT NULL DEFAULT '',
  document_id   TEXT NOT NULL DEFAULT '',
  session_id    TEXT NOT NULL DEFAULT '',
  body_format   TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL DEFAULT 'local',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_session_document_versions_document
ON session_document_versions(document_id, created_at);

CREATE TRIGGER IF NOT EXISTS session_documents_version_before_update
BEFORE UPDATE OF body ON session_documents
WHEN NEW.body IS NOT OLD.body
  AND OLD.body <> ''
  AND (
    EXISTS (
      SELECT 1 FROM e2ee_apply_guard
      WHERE workspace_id = OLD.workspace_id
        AND table_name = 'session_documents'
        AND row_id = OLD.id
    )
    OR NOT EXISTS (
      SELECT 1 FROM session_document_versions AS recent
      WHERE recent.document_id = OLD.id
        AND recent.source = 'local'
        AND recent.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes')
    )
  )
BEGIN
  INSERT INTO session_document_versions (
    id, workspace_id, document_id, session_id, body_format, body, source
  )
  VALUES (
    lower(hex(randomblob(16))),
    OLD.workspace_id,
    OLD.id,
    OLD.session_id,
    OLD.body_format,
    OLD.body,
    CASE WHEN EXISTS (
      SELECT 1 FROM e2ee_apply_guard
      WHERE workspace_id = OLD.workspace_id
        AND table_name = 'session_documents'
        AND row_id = OLD.id
    ) THEN 'sync' ELSE 'local' END
  );

  DELETE FROM session_document_versions
  WHERE document_id = OLD.id
    AND id NOT IN (
      SELECT id FROM session_document_versions
      WHERE document_id = OLD.id
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    );
END;
