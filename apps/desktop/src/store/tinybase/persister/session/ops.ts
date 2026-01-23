import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import type { Store } from "../../store/main";

export interface SessionOpsConfig {
  store: Store;
  reloadSessions: () => Promise<void>;
  // Lazy loading utilities from the factory
  loadEntityContent?: (entityId: string) => Promise<boolean>;
  isEntityContentLoaded?: (entityId: string) => boolean;
  isEntityContentLoading?: (entityId: string) => boolean;
}

let config: SessionOpsConfig | null = null;

export function initSessionOps(cfg: SessionOpsConfig) {
  config = cfg;
}

function getConfig(): SessionOpsConfig {
  if (!config) {
    throw new Error("[SessionOps] Not initialized. Call initSessionOps first.");
  }
  return config;
}

/**
 * Check if a session's content is fully loaded.
 */
export function isSessionContentLoaded(sessionId: string): boolean {
  const { isEntityContentLoaded } = getConfig();
  return isEntityContentLoaded?.(sessionId) ?? false;
}

/**
 * Check if a session's content is currently loading.
 */
export function isSessionContentLoading(sessionId: string): boolean {
  const { isEntityContentLoading } = getConfig();
  return isEntityContentLoading?.(sessionId) ?? false;
}

export async function moveSessionToFolder(
  sessionId: string,
  targetFolderId: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { store, reloadSessions } = getConfig();

  store.setCell("sessions", sessionId, "folder_id", targetFolderId);

  const result = await fsSyncCommands.moveSession(sessionId, targetFolderId);

  if (result.status === "error") {
    console.error("[SessionOps] moveSession failed:", result.error);
    await reloadSessions();
    return { status: "error", error: result.error };
  }

  return { status: "ok" };
}

export async function renameFolder(
  oldPath: string,
  newPath: string,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  const { store } = getConfig();

  const result = await fsSyncCommands.renameFolder(oldPath, newPath);

  if (result.status === "error") {
    console.error("[SessionOps] renameFolder failed:", result.error);
    return { status: "error", error: result.error };
  }

  store.transaction(() => {
    const sessionIds = store.getRowIds("sessions");
    for (const id of sessionIds) {
      const folderId = store.getCell("sessions", id, "folder_id");
      if (folderId === oldPath) {
        store.setCell("sessions", id, "folder_id", newPath);
      } else if (folderId?.startsWith(oldPath + "/")) {
        store.setCell(
          "sessions",
          id,
          "folder_id",
          folderId.replace(oldPath, newPath),
        );
      }
    }
  });

  return { status: "ok" };
}

/**
 * Load content (transcript and notes) for a session on-demand.
 * This delegates to the factory's loadEntityContent function.
 * Returns true if content was loaded, false if already loaded or loading.
 */
export async function loadSessionContent(sessionId: string): Promise<boolean> {
  const { store, loadEntityContent } = getConfig();

  // Check if session exists in store
  if (!store.hasRow("sessions", sessionId)) {
    console.warn(
      `[SessionOps] loadSessionContent: session ${sessionId} not found`,
    );
    return false;
  }

  // Delegate to factory's loadEntityContent if available
  if (loadEntityContent) {
    return loadEntityContent(sessionId);
  }

  // Lazy loading not enabled
  return false;
}

/**
 * Ensure content is loaded for a session.
 * This is a convenience wrapper that handles the async loading.
 */
export async function ensureSessionContentLoaded(
  sessionId: string,
): Promise<void> {
  if (
    !isSessionContentLoaded(sessionId) &&
    !isSessionContentLoading(sessionId)
  ) {
    await loadSessionContent(sessionId);
  }
}

export const sessionOps = {
  moveSessionToFolder,
  renameFolder,
  loadSessionContent,
  ensureSessionContentLoaded,
  isSessionContentLoaded,
  isSessionContentLoading,
};
