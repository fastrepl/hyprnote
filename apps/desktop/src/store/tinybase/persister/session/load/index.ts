import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import {
  SESSION_META_FILE,
  SESSION_NOTE_EXTENSION,
  SESSION_TRANSCRIPT_FILE,
} from "../../shared";
import { processMdFile } from "./note";
import { processMetaFile } from "./session";
import { processTranscriptFile } from "./transcript";
import { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";

export { extractSessionIdAndFolder } from "./session";
export { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";

const LABEL = "SessionPersister";

async function processFiles(
  files: Partial<Record<string, string>>,
  result: LoadedSessionData,
  now: string,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(SESSION_META_FILE)) {
      processMetaFile(path, content, result, now);
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

export async function loadAllSessionData(
  dataDir: string,
): Promise<LoadedSessionData> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());
  const now = new Date().toISOString();

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_META_FILE, SESSION_TRANSCRIPT_FILE, `*${SESSION_NOTE_EXTENSION}`],
    true,
  );

  if (scanResult.status === "error") {
    console.error(`[${LABEL}] scan error:`, scanResult.error);
    return result;
  }

  await processFiles(scanResult.data.files, result, now);
  return result;
}

export async function loadSingleSession(
  dataDir: string,
  sessionId: string,
): Promise<LoadedSessionData> {
  const result = createEmptyLoadedSessionData();
  const sessionDir = [dataDir, "sessions", sessionId].join(sep());
  const now = new Date().toISOString();

  const scanResult = await fsSyncCommands.scanAndRead(
    sessionDir,
    [SESSION_META_FILE, SESSION_TRANSCRIPT_FILE, `*${SESSION_NOTE_EXTENSION}`],
    false,
  );

  if (scanResult.status === "error") {
    console.error(`loadSingleSession scan error:`, scanResult.error);
    return result;
  }

  await processFiles(scanResult.data.files, result, now);
  return result;
}
