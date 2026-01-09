import type { ChangedTables } from "../shared";

export function parseHumanIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const dirIndex = parts.indexOf("humans");
  if (dirIndex === -1 || dirIndex + 1 >= parts.length) {
    return null;
  }
  const filename = parts[dirIndex + 1];
  if (!filename?.endsWith(".md")) {
    return null;
  }
  return filename.slice(0, -3);
}

export function getChangedHumanIds(
  changedTables: ChangedTables,
): Set<string> | undefined {
  const changedRows = changedTables.humans;
  if (!changedRows) return undefined;
  return new Set(Object.keys(changedRows));
}
