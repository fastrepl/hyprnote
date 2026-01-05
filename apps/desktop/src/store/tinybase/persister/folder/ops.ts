import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import type { Store } from "../../store/main";

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

  store.setCell("sessions", sessionId, "folder_id", targetFolderId);

  const result = await fsSyncCommands.moveSession(sessionId, targetFolderId);

  if (result.status === "error") {
    console.error("[FolderOps] moveSession failed:", result.error);
    await reloadFolders();
    return { status: "error", error: result.error };
  }

  return { status: "ok" };
}

export async function createFolder(
  folderPath: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { reloadFolders } = getConfig();

  const result = await fsSyncCommands.createFolder(folderPath);

  if (result.status === "error") {
    console.error("[FolderOps] createFolder failed:", result.error);
    return { status: "error", error: result.error };
  }

  await reloadFolders();
  return { status: "ok" };
}

export async function renameFolder(
  oldPath: string,
  newPath: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { reloadFolders } = getConfig();

  const result = await fsSyncCommands.renameFolder(oldPath, newPath);

  if (result.status === "error") {
    console.error("[FolderOps] renameFolder failed:", result.error);
    return { status: "error", error: result.error };
  }

  await reloadFolders();
  return { status: "ok" };
}

export async function deleteFolder(
  folderPath: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { reloadFolders } = getConfig();

  const result = await fsSyncCommands.deleteFolder(folderPath);

  if (result.status === "error") {
    console.error("[FolderOps] deleteFolder failed:", result.error);
    return { status: "error", error: result.error };
  }

  await reloadFolders();
  return { status: "ok" };
}

export const folderOps = {
  moveSessionToFolder,
  createFolder,
  renameFolder,
  deleteFolder,
};
