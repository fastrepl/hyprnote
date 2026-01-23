import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import type { Store } from "../../store/main";
import { getDataDir } from "../shared/paths";
import {
  isSessionContentLoaded,
  isSessionContentLoading,
  loadSessionContentData,
  markSessionContentLoaded,
  markSessionContentLoading,
} from "./load/index";

export interface SessionOpsConfig {
  store: Store;
  reloadSessions: () => Promise<void>;
}

let config: SessionOpsConfig | null = null;

export function initSessionOps(cfg: SessionOpsConfig) {
  config = cfg;
}

export { isSessionContentLoaded, isSessionContentLoading };

function getConfig(): SessionOpsConfig {
  if (!config) {
    throw new Error("[SessionOps] Not initialized. Call initSessionOps first.");
  }
  return config;
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
 * This is the core of the lazy loading system.
 * Returns true if content was loaded, false if already loaded or loading.
 */
export async function loadSessionContent(
  sessionId: string,
): Promise<boolean> {
  // Already loaded or currently loading - skip
  if (isSessionContentLoaded(sessionId) || isSessionContentLoading(sessionId)) {
    return false;
  }

  const { store } = getConfig();

  // Check if session exists in store
  if (!store.hasRow("sessions", sessionId)) {
    console.warn(`[SessionOps] loadSessionContent: session ${sessionId} not found`);
    return false;
  }

  markSessionContentLoading(sessionId);

  try {
    const dataDir = await getDataDir();
    const loadResult = await loadSessionContentData(dataDir, sessionId);

    if (loadResult.status === "error") {
      console.error(`[SessionOps] loadSessionContent error:`, loadResult.error);
      markSessionContentLoaded(sessionId); // Mark as loaded to prevent retry loops
      return false;
    }

    const { sessions, transcripts, enhanced_notes } = loadResult.data;

    // Apply content to store
    store.transaction(() => {
      // Update session raw_md if we have it
      const sessionContent = sessions[sessionId];
      if (sessionContent?.raw_md) {
        store.setCell("sessions", sessionId, "raw_md", sessionContent.raw_md);
      }

      // Add transcripts
      for (const [transcriptId, transcript] of Object.entries(transcripts)) {
        store.setRow("transcripts", transcriptId, transcript);
      }

      // Add enhanced notes
      for (const [noteId, note] of Object.entries(enhanced_notes)) {
        store.setRow("enhanced_notes", noteId, note);
      }
    });

    markSessionContentLoaded(sessionId);
    return true;
  } catch (error) {
    console.error(`[SessionOps] loadSessionContent error:`, error);
    markSessionContentLoaded(sessionId); // Mark as loaded to prevent retry loops
    return false;
  }
}

/**
 * Ensure content is loaded for a session.
 * This is a convenience wrapper that handles the async loading.
 */
export async function ensureSessionContentLoaded(
  sessionId: string,
): Promise<void> {
  if (!isSessionContentLoaded(sessionId) && !isSessionContentLoading(sessionId)) {
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
