import {
  buildVersionHistory,
  mapConflictRows,
  type SessionConflict,
  type SessionConflictRow,
  type SessionVersionRow,
  type VersionHistoryEntry,
} from "@/data/conflicts-model";
import { docToPlainText, stripMarkdownTitle } from "@/data/note-doc";
import { saveSessionNote, saveSessionTitle } from "@/data/session";
import { execute, executeTransaction, useLiveQuery } from "@/db";

export type {
  SessionConflict,
  VersionHistoryEntry,
} from "@/data/conflicts-model";

export type RestoredNote = {
  title: string;
  bodyText: string | null;
  bodyFormat: "prosemirror_json" | "markdown" | null;
};

// The note document id equals the session id, so both a body conflict on
// session_documents and a title conflict on sessions carry the session id.
const NOTE_CONFLICT_PREDICATE = `
  resolved_at IS NULL
  AND row_id = ?
  AND (
    (table_name = 'session_documents' AND field_name = 'body')
    OR (table_name = 'sessions' AND field_name = 'title')
  )
`;

const SESSION_CONFLICTS_SQL = `
SELECT id, row_id, table_name, field_name, lost_side, edited_at_ms, value_json,
  created_at
FROM e2ee_field_conflicts
WHERE ${NOTE_CONFLICT_PREDICATE}
ORDER BY created_at DESC, id DESC
`;

const SESSION_VERSIONS_SQL = `
SELECT id, body, body_format, source, created_at
FROM session_document_versions
WHERE document_id = ?
ORDER BY created_at DESC, id DESC
`;

const RESOLVE_SESSION_CONFLICTS_SQL = `
UPDATE e2ee_field_conflicts
SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE ${NOTE_CONFLICT_PREDICATE}
`;

const RESOLVE_CONFLICT_SQL = `
UPDATE e2ee_field_conflicts
SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = ? AND resolved_at IS NULL
`;

const CONFLICT_COUNT_SQL = `
SELECT COUNT(DISTINCT row_id) AS conflicted_notes
FROM e2ee_field_conflicts
WHERE resolved_at IS NULL
  AND (
    (table_name = 'session_documents' AND field_name = 'body')
    OR (table_name = 'sessions' AND field_name = 'title')
  )
`;

const PARKED_COUNT_SQL = `
SELECT
  COALESCE(SUM(CASE WHEN reason IN ('unknown_table', 'unknown_field')
    THEN 1 ELSE 0 END), 0) AS awaiting_update,
  COALESCE(SUM(CASE WHEN reason = 'too_large' THEN 1 ELSE 0 END), 0) AS too_large
FROM e2ee_parked_records
`;

export function useSessionConflicts(sessionId: string) {
  const { data, error, isLoading } = useLiveQuery<
    SessionConflictRow,
    SessionConflict[]
  >({
    sql: SESSION_CONFLICTS_SQL,
    params: [sessionId],
    mapRows: mapConflictRows,
  });
  return { data: data ?? [], error, isLoading };
}

export function useSessionVersionHistory(sessionId: string) {
  const conflicts = useSessionConflicts(sessionId);
  const versions = useLiveQuery<SessionVersionRow, SessionVersionRow[]>({
    sql: SESSION_VERSIONS_SQL,
    params: [sessionId],
    mapRows: (rows) => rows,
  });
  return {
    data: buildVersionHistory(conflicts.data, versions.data ?? []),
    error: conflicts.error ?? versions.error,
    isLoading: conflicts.isLoading || versions.isLoading,
  };
}

export function useSyncHealth() {
  const conflicts = useLiveQuery<{ conflicted_notes: number }, number>({
    sql: CONFLICT_COUNT_SQL,
    mapRows: (rows) => rows[0]?.conflicted_notes ?? 0,
  });
  const parked = useLiveQuery<
    { awaiting_update: number; too_large: number },
    { awaitingUpdate: number; tooLarge: number }
  >({
    sql: PARKED_COUNT_SQL,
    mapRows: (rows) => ({
      awaitingUpdate: rows[0]?.awaiting_update ?? 0,
      tooLarge: rows[0]?.too_large ?? 0,
    }),
  });
  return {
    conflictedNotes: conflicts.data ?? 0,
    awaitingUpdate: parked.data?.awaitingUpdate ?? 0,
    tooLarge: parked.data?.tooLarge ?? 0,
  };
}

export async function resolveSessionConflicts(sessionId: string) {
  await executeTransaction([
    { sql: RESOLVE_SESSION_CONFLICTS_SQL, params: [sessionId] },
  ]);
}

async function resolveConflict(conflictId: string) {
  await executeTransaction([
    { sql: RESOLVE_CONFLICT_SQL, params: [conflictId] },
  ]);
}

async function currentTitle(sessionId: string): Promise<string> {
  const rows = await execute<{ title: string }>(
    "SELECT title FROM sessions WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [sessionId],
  );
  return rows[0]?.title ?? "";
}

// Writes an older body back as a normal local edit, so it syncs and versions
// like anything else the user types.
async function restoreNoteBody(
  sessionId: string,
  body: string,
  bodyFormat: "prosemirror_json" | "markdown",
): Promise<RestoredNote> {
  const document =
    bodyFormat === "markdown" ? stripMarkdownTitle(body) : docToPlainText(body);
  // A body without its own heading keeps the title the note has now.
  const title = document.title.trim() || (await currentTitle(sessionId));
  await saveSessionNote(sessionId, {
    title,
    bodyText: document.text,
    bodyFormat,
  });
  return { title, bodyText: document.text, bodyFormat };
}

export async function restoreConflict(
  conflict: SessionConflict,
): Promise<RestoredNote> {
  const restored =
    conflict.field === "title"
      ? await restoreNoteTitle(conflict.sessionId, conflict.value)
      : await restoreNoteBody(
          conflict.sessionId,
          conflict.value,
          conflict.bodyFormat,
        );
  await resolveConflict(conflict.id);
  return restored;
}

async function restoreNoteTitle(
  sessionId: string,
  title: string,
): Promise<RestoredNote> {
  await saveSessionTitle(sessionId, title);
  return { title, bodyText: null, bodyFormat: null };
}

export async function restoreHistoryEntry(
  sessionId: string,
  entry: VersionHistoryEntry,
): Promise<RestoredNote> {
  const restored = await restoreNoteBody(
    sessionId,
    entry.body,
    entry.bodyFormat,
  );
  if (entry.conflictId) await resolveConflict(entry.conflictId);
  return restored;
}
