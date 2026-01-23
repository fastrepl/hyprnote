import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import { SESSION_NOTE_EXTENSION, SESSION_TRANSCRIPT_FILE } from "../../shared";
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
 * Load content (transcript and notes) for a single session.
 * This is called on-demand when a session is opened.
 */
export async function loadSessionContentData(
  dataDir: string,
  sessionId: string,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  // Initialize session entry so processMdFile can set raw_md on it
  result.sessions[sessionId] = {};
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
    console.error(
      `[${LABEL}] loadSessionContentData scan error:`,
      scanResult.error,
    );
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
