import type { ChangedTables } from "../shared";

export function parseOrganizationIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const dirIndex = parts.indexOf("organizations");
  if (dirIndex === -1 || dirIndex + 1 >= parts.length) {
    return null;
  }
  const filename = parts[dirIndex + 1];
  if (!filename?.endsWith(".md")) {
    return null;
  }
  return filename.slice(0, -3);
}

export function getChangedOrganizationIds(
  changedTables: ChangedTables,
): Set<string> | undefined {
  const changedRows = changedTables.organizations;
  if (!changedRows) return undefined;
  return new Set(Object.keys(changedRows));
}
