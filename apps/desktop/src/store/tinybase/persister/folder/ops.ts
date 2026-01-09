import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import type { Store } from "../../store/main";
import { markInternalChange } from "./persister";

export interface FolderOpsConfig {
  store: Store;
  reloadFolders: () => Promise<void>;
}

let config: FolderOpsConfig | null = null;

export function initFolderOps(cfg: FolderOpsConfig) {
  config = cfg;
}

function getConfig(): FolderOpsConfig {
  if (!config) {
    throw new Error("[FolderOps] Not initialized. Call initFolderOps first.");
  }
  return config;
}

export async function moveSessionToFolder(
  sessionId: string,
  targetFolderId: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { store, reloadFolders } = getConfig();

  // Optimistically update TinyBase
  store.setCell("sessions", sessionId, "folder_id", targetFolderId);

  // Mark as internal change to prevent watcher reload
  markInternalChange();

  const result = await fsSyncCommands.moveSession(sessionId, targetFolderId);

  if (result.status === "error") {
    console.error("[FolderOps] moveSession failed:", result.error);
    // Reload to restore correct state on error
    await reloadFolders();
    return { status: "error", error: result.error };
  }

  return { status: "ok" };
}

export async function renameFolder(
  oldPath: string,
  newPath: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { reloadFolders } = getConfig();

  // Mark as internal change to prevent watcher reload
  markInternalChange();

  const result = await fsSyncCommands.renameFolder(oldPath, newPath);

  if (result.status === "error") {
    console.error("[FolderOps] renameFolder failed:", result.error);
    return { status: "error", error: result.error };
  }

  await reloadFolders();
  return { status: "ok" };
}

export const folderOps = {
  moveSessionToFolder,
  renameFolder,
};
