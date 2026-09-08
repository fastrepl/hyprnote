import { collectFolderPaths, normalizeFolderPath } from "@anlg/utils/folders";

import { executeTransaction, useLiveQuery } from "@/db";
import { id } from "@/lib/ids";

import { FOLDER_PATHS_SQL, sessionFolderStatements } from "./folder-model";

export function useFolderPaths() {
  const {
    data = [],
    error,
    isLoading,
  } = useLiveQuery<{ folder_path: string }, string[]>({
    sql: FOLDER_PATHS_SQL,
    mapRows: (rows) => collectFolderPaths(rows.map((row) => row.folder_path)),
  });
  return { data, error, isLoading };
}

export function useSessionFolder(sessionId: string) {
  return useLiveQuery<{ folder_path: string }, string>({
    sql: "SELECT folder_path FROM sessions WHERE id = ? AND deleted_at IS NULL",
    params: [sessionId],
    mapRows: (rows) => normalizeFolderPath(rows[0]?.folder_path ?? "") ?? "",
  });
}

export async function saveSessionFolder(sessionId: string, path: string) {
  await executeTransaction(sessionFolderStatements(sessionId, path, id));
}
