export const TIMELINE_PAGE_SIZE = 40;

export const TIMELINE_SQL = `
WITH dated_sessions AS (
  SELECT id, title, created_at, event_json, folder_path,
    COALESCE(
      CASE WHEN json_valid(event_json) THEN
        CASE WHEN json_type(event_json, '$.started_at') = 'text'
          THEN julianday(json_extract(event_json, '$.started_at')) END
      END,
      julianday(created_at)
    ) AS started_at_day
  FROM sessions
  WHERE deleted_at IS NULL
), grouped_sessions AS (
  SELECT *, CASE WHEN started_at_day > julianday(?) THEN 0 ELSE 1 END AS time_group
  FROM dated_sessions
), timeline_page AS MATERIALIZED (
  SELECT * FROM grouped_sessions
  ORDER BY time_group,
    CASE WHEN time_group = 0 THEN started_at_day END ASC,
    started_at_day DESC, id DESC
  LIMIT ?
)
SELECT
  sessions.id,
  sessions.title,
  sessions.created_at,
  sessions.event_json,
  sessions.folder_path,
  COALESCE((
    SELECT json_group_array(name)
    FROM (
      SELECT DISTINCT tags.name AS name
      FROM session_tags
      JOIN tags ON tags.id = session_tags.tag_id
      WHERE session_tags.session_id = sessions.id
        AND session_tags.deleted_at IS NULL
        AND tags.deleted_at IS NULL
        AND trim(tags.name) <> ''
      ORDER BY tags.name COLLATE NOCASE
    )
  ), '[]') AS tags_json
FROM timeline_page AS sessions
ORDER BY time_group,
  CASE WHEN time_group = 0 THEN started_at_day END ASC,
  started_at_day DESC, sessions.id DESC
`;
