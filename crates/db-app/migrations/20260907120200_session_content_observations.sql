CREATE VIEW session_content_observations AS
SELECT workspace_id, id AS session_id, 'title:' || id AS content_id,
  title AS content_version, deleted_at
FROM sessions WHERE trim(title) <> ''
UNION ALL
SELECT workspace_id, session_id, 'document:' || id, content_version, deleted_at
FROM session_documents
WHERE trim(body) <> '' AND (
  body_format <> 'prosemirror_json' OR NOT json_valid(body) OR EXISTS (
    SELECT 1 FROM json_tree(CASE WHEN json_valid(body) THEN body ELSE '{}' END)
    WHERE (key = 'text' AND trim(CAST(atom AS TEXT)) <> '')
      OR (key = 'type' AND atom NOT IN ('doc', 'paragraph', 'text', 'hardBreak'))
  )
)
UNION ALL
SELECT workspace_id, session_id, 'transcript:' || id, content_version, deleted_at
FROM transcripts
WHERE trim(words_json) NOT IN ('', '[]')
UNION ALL
SELECT workspace_id, session_id, 'attachment:' || id,
  json_array(sha256, size_bytes, relative_path, source_type, source_id), deleted_at
FROM session_attachments WHERE size_bytes > 0;
