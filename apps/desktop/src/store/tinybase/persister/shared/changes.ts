import type { ChangedTables, TablesContent } from "./types";

export type ChangeResult = {
  changedIds: Set<string>;
  hasUnresolvedDeletions: boolean;
};

type IdExtractor = (id: string, tables: TablesContent) => string | undefined;

type TableConfig = {
  table: keyof ChangedTables;
  extractId: IdExtractor;
  ignoreMissingParent?: boolean;
};

export function getChangedIds(
  tables: TablesContent,
  changedTables: ChangedTables,
  config: TableConfig[],
): ChangeResult | undefined {
  const changedIds = new Set<string>();
  let hasUnresolvedDeletions = false;

  for (const { table, extractId, ignoreMissingParent } of config) {
    const changed = changedTables[table];
    if (!changed) continue;

    for (const id of Object.keys(changed)) {
      const rootId = extractId(id, tables);
      if (rootId) {
        changedIds.add(rootId);
      } else if (!ignoreMissingParent) {
        hasUnresolvedDeletions = true;
      }
    }
  }

  if (changedIds.size === 0 && !hasUnresolvedDeletions) {
    return undefined;
  }

  return { changedIds, hasUnresolvedDeletions };
}
