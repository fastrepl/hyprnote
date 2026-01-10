import type { TablesContent } from "../shared";

export function getValidSessionIds(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.sessions ?? {}));
}

export function getValidNoteIds(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.enhanced_notes ?? {}));
}

export function getSessionsWithMemo(tables: TablesContent): Set<string> {
  return new Set(
    Object.entries(tables.sessions ?? {})
      .filter(([, s]) => s.raw_md)
      .map(([id]) => id),
  );
}
