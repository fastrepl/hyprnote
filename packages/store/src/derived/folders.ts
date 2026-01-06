import type { SessionStorage } from "../schema";

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
}

export function deriveFoldersFromSessions(
  sessions: Record<string, SessionStorage>,
): FolderNode[] {
  const paths = new Set<string>();

  for (const session of Object.values(sessions)) {
    const folderId = session.folder_id;
    if (folderId) {
      paths.add(folderId);
      let current = folderId;
      while (current.includes("/")) {
        current = current.substring(0, current.lastIndexOf("/"));
        if (current) {
          paths.add(current);
        }
      }
    }
  }

  const folderMap = new Map<string, FolderNode>();

  for (const path of paths) {
    const parts = path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;

    folderMap.set(path, {
      id: path,
      name,
      parentId: parentPath,
      children: [],
    });
  }

  const rootFolders: FolderNode[] = [];

  for (const folder of folderMap.values()) {
    if (folder.parentId === null) {
      rootFolders.push(folder);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folder);
      } else {
        rootFolders.push(folder);
      }
    }
  }

  const sortFolders = (folders: FolderNode[]): void => {
    folders.sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of folders) {
      sortFolders(folder.children);
    }
  };

  sortFolders(rootFolders);

  return rootFolders;
}

export function getFolderPath(folderId: string): string[] {
  if (!folderId) return [];
  return folderId.split("/");
}

export function getFolderName(folderId: string): string {
  if (!folderId) return "";
  const parts = folderId.split("/");
  return parts[parts.length - 1];
}

export function getParentFolderId(folderId: string): string | null {
  if (!folderId) return null;
  const lastSlash = folderId.lastIndexOf("/");
  if (lastSlash === -1) return null;
  return folderId.substring(0, lastSlash);
}

export function getAllFolderIds(
  sessions: Record<string, SessionStorage>,
): string[] {
  const paths = new Set<string>();

  for (const session of Object.values(sessions)) {
    const folderId = session.folder_id;
    if (folderId) {
      paths.add(folderId);
      let current = folderId;
      while (current.includes("/")) {
        current = current.substring(0, current.lastIndexOf("/"));
        if (current) {
          paths.add(current);
        }
      }
    }
  }

  return Array.from(paths).sort();
}
