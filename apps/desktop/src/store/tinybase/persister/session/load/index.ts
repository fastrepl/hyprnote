import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import {
  SESSION_META_FILE,
  SESSION_NOTE_EXTENSION,
  SESSION_TRANSCRIPT_FILE,
} from "../../shared";
import {
  err,
  isDirectoryNotFoundError,
  type LoadResult,
  ok,
} from "../../shared";
import { processMetaFile } from "./meta";
import { processMdFile } from "./note";
import { processTranscriptFile } from "./transcript";
import { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";

export { extractSessionIdAndFolder } from "./meta";
export { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";
export { loadSessionContentData } from "./content";

const LABEL = "SessionPersister";

async function processFiles(
  files: Partial<Record<string, string>>,
  result: LoadedSessionData,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_META_FILE)) {
      processMetaFile(path, content, result);
    }
  }

  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_TRANSCRIPT_FILE)) {
      processTranscriptFile(path, content, result);
    }
  }

  const mdPromises: Promise<void>[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_NOTE_EXTENSION)) {
      mdPromises.push(processMdFile(path, content, result));
    }
  }
  await Promise.all(mdPromises);
}

/**
 * Load all session data (metadata + content) at once.
 * This is the original eager loading approach - kept for backward compatibility.
 */
export async function loadAllSessionData(
  dataDir: string,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_META_FILE, SESSION_TRANSCRIPT_FILE, `*${SESSION_NOTE_EXTENSION}`],
    true,
    null,
  );

  if (scanResult.status === "error") {
    if (isDirectoryNotFoundError(scanResult.error)) {
      return ok(result);
    }
    console.error(`[${LABEL}] scan error:`, scanResult.error);
    return err(scanResult.error);
  }

  await processFiles(scanResult.data.files, result);

  return ok(result);
}

/**
 * Load only session metadata (from _meta.json files) at startup.
 * Content (transcripts, notes) will be loaded on-demand when sessions are opened.
 * This is the lazy loading approach for faster startup.
 */
export async function loadAllSessionMetadata(
  dataDir: string,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_META_FILE], // Only load metadata files
    true,
    null,
  );

  if (scanResult.status === "error") {
    if (isDirectoryNotFoundError(scanResult.error)) {
      return ok(result);
    }
    console.error(`[${LABEL}] metadata scan error:`, scanResult.error);
    return err(scanResult.error);
  }

  // Process only metadata files
  for (const [path, content] of Object.entries(scanResult.data.files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_META_FILE)) {
      processMetaFile(path, content, result);
    }
  }

  return ok(result);
}

export async function loadSingleSession(
  dataDir: string,
  sessionId: string,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_META_FILE, SESSION_TRANSCRIPT_FILE, `*${SESSION_NOTE_EXTENSION}`],
    true,
    `/${sessionId}/`,
  );

  if (scanResult.status === "error") {
    if (isDirectoryNotFoundError(scanResult.error)) {
      return ok(result);
    }
    console.error(`loadSingleSession scan error:`, scanResult.error);
    return err(scanResult.error);
  }

  await processFiles(scanResult.data.files, result);
  return ok(result);
}
