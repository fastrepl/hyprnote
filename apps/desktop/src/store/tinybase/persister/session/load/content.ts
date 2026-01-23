import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import {
  SESSION_NOTE_EXTENSION,
  SESSION_TRANSCRIPT_FILE,
} from "../../shared";
import {
  err,
  isDirectoryNotFoundError,
  type LoadResult,
  ok,
} from "../../shared";
import { processMdFile } from "./note";
import { processTranscriptFile } from "./transcript";
import { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";

const LABEL = "SessionPersister";

/**
 * In-memory tracker for which sessions have their content loaded.
 * This is ephemeral - on app restart, content needs to be loaded again on-demand.
 */
const loadedContentSessionIds = new Set<string>();
const loadingContentSessionIds = new Set<string>();

export function isSessionContentLoaded(sessionId: string): boolean {
  return loadedContentSessionIds.has(sessionId);
}

export function isSessionContentLoading(sessionId: string): boolean {
  return loadingContentSessionIds.has(sessionId);
}

export function markSessionContentLoaded(sessionId: string): void {
  loadedContentSessionIds.add(sessionId);
  loadingContentSessionIds.delete(sessionId);
}

export function markSessionContentLoading(sessionId: string): void {
  loadingContentSessionIds.add(sessionId);
}

export function markSessionContentUnloaded(sessionId: string): void {
  loadedContentSessionIds.delete(sessionId);
  loadingContentSessionIds.delete(sessionId);
}

export function clearAllContentLoadingState(): void {
  loadedContentSessionIds.clear();
  loadingContentSessionIds.clear();
}

export function getLoadedSessionIds(): ReadonlySet<string> {
  return loadedContentSessionIds;
}

/**
 * Load content (transcript and notes) for a single session.
 * This is called on-demand when a session is opened.
 */
export async function loadSessionContentData(
  dataDir: string,
  sessionId: string,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_TRANSCRIPT_FILE, `*${SESSION_NOTE_EXTENSION}`],
    true,
    `/${sessionId}/`,
  );

  if (scanResult.status === "error") {
    if (isDirectoryNotFoundError(scanResult.error)) {
      return ok(result);
    }
    console.error(`[${LABEL}] loadSessionContentData scan error:`, scanResult.error);
    return err(scanResult.error);
  }

  // Process transcript files
  for (const [path, content] of Object.entries(scanResult.data.files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_TRANSCRIPT_FILE)) {
      processTranscriptFile(path, content, result);
    }
  }

  // Process note files (async)
  const mdPromises: Promise<void>[] = [];
  for (const [path, content] of Object.entries(scanResult.data.files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_NOTE_EXTENSION)) {
      mdPromises.push(processMdFile(path, content, result));
    }
  }
  await Promise.all(mdPromises);

  return ok(result);
}
