import { ancestorFolderPaths, normalizeFolderPath } from "@anlg/utils/folders";

export const FOLDER_PATHS_SQL = `
  SELECT folder_path
  FROM (
    SELECT folder_path
    FROM sessions
    WHERE deleted_at IS NULL
      AND folder_path != ''
    UNION
    SELECT folder_path
    FROM folder_attachments
    WHERE deleted_at IS NULL
      AND folder_path != ''
    UNION
    SELECT path AS folder_path
    FROM folders
    WHERE deleted_at IS NULL
      AND path != ''
  )
`;

export function sessionFolderStatements(
  sessionId: string,
  folderPath: string,
  createId: () => string,
) {
  const path = normalizeFolderPath(folderPath);
  if (path === null) throw new Error("Enter a valid folder name.");
  return [
    ...ancestorFolderPaths(path).flatMap((ancestor) =>
      ensureFolderStatements(ancestor, createId()),
    ),
    {
      sql: `UPDATE sessions SET folder_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND deleted_at IS NULL`,
      params: [path, sessionId],
    },
  ];
}

function ensureFolderStatements(path: string, metadataId: string) {
  return [
    {
      sql: `
        UPDATE folders
        SET
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          deleted_at = NULL
        WHERE id = (
          SELECT id
          FROM folders
          WHERE path = ?
          ORDER BY deleted_at IS NULL DESC,
            updated_at DESC,
            id
          LIMIT 1
        )
      `,
      params: [path],
    },
    {
      sql: `
        INSERT INTO folders (
          id,
          workspace_id,
          path
        )
        SELECT
          ?,
          COALESCE((
            SELECT session.workspace_id
            FROM sessions AS session
            WHERE session.deleted_at IS NULL
              AND (session.folder_path = ? OR session.folder_path LIKE ?)
            ORDER BY session.updated_at DESC, session.id
            LIMIT 1
          ), ''),
          ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM folders
          WHERE path = ?
            AND deleted_at IS NULL
        )
      `,
      params: [metadataId, path, `${path}/%`, path, path],
    },
  ];
}
