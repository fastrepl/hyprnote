import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import type { Store } from "../../store/main";
import { getDataDir } from "../shared";
import { loadSessionContent } from "./load/index";

export interface SessionOpsConfig {
  store: Store;
  reloadSessions: () => Promise<void>;
}

let config: SessionOpsConfig | null = null;

const contentLoadState = {
  loaded: new Set<string>(),
  loading: new Set<string>(),
};

export function initSessionOps(cfg: SessionOpsConfig) {
  config = cfg;
}

export function clearContentLoadState() {
  contentLoadState.loaded.clear();
  contentLoadState.loading.clear();
}

export function isSessionContentLoaded(sessionId: string): boolean {
  return contentLoadState.loaded.has(sessionId);
}

export function isSessionContentLoading(sessionId: string): boolean {
  return contentLoadState.loading.has(sessionId);
}

export function markSessionContentLoaded(sessionId: string) {
  contentLoadState.loaded.add(sessionId);
  contentLoadState.loading.delete(sessionId);
}

function getConfig(): SessionOpsConfig {
  if (!config) {
    throw new Error("[SessionOps] Not initialized. Call initSessionOps first.");
  }
  return config;
}

export async function ensureSessionContentLoaded(
  sessionId: string,
): Promise<boolean> {
  if (contentLoadState.loaded.has(sessionId)) {
    return true;
  }

  if (contentLoadState.loading.has(sessionId)) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (contentLoadState.loaded.has(sessionId)) {
          clearInterval(checkInterval);
          resolve(true);
        }
        if (!contentLoadState.loading.has(sessionId)) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 50);
    });
  }

  contentLoadState.loading.add(sessionId);

  try {
    const { store } = getConfig();
    const dataDir = await getDataDir();
    const result = await loadSessionContent(dataDir, sessionId);

    if (result.status === "error") {
      console.error(
        `[SessionOps] Failed to load content for session ${sessionId}:`,
        result.error,
      );
      contentLoadState.loading.delete(sessionId);
      contentLoadState.loaded.add(sessionId);
      return false;
    }

    store.transaction(() => {
      for (const [transcriptId, transcript] of Object.entries(
        result.data.transcripts,
      )) {
        store.setRow("transcripts", transcriptId, transcript);
      }

      for (const [noteId, note] of Object.entries(result.data.enhanced_notes)) {
        store.setRow("enhanced_notes", noteId, note);
      }

      const session = result.data.sessions[sessionId];
      if (session?.raw_md) {
        store.setCell("sessions", sessionId, "raw_md", session.raw_md);
      }
    });

    contentLoadState.loading.delete(sessionId);
    contentLoadState.loaded.add(sessionId);
    return true;
  } catch (error) {
    console.error(
      `[SessionOps] Error loading content for session ${sessionId}:`,
      error,
    );
    contentLoadState.loading.delete(sessionId);
    contentLoadState.loaded.add(sessionId);
    return false;
  }
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

export const sessionOps = {
  moveSessionToFolder,
  renameFolder,
};
