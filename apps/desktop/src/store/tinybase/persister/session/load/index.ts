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
import { extractSessionIdAndFolder, processMetaFile } from "./meta";
import { processMdFile } from "./note";
import { processTranscriptFile } from "./transcript";
import {
  createEmptyLoadedSessionData,
  type LoadedSessionData,
  SESSION_TABLES,
} from "./types";

export { extractSessionIdAndFolder } from "./meta";
export { createEmptyLoadedSessionData, type LoadedSessionData } from "./types";

export type ProgressiveBatchCallback = (
  batch: LoadedSessionData,
  progress: { loaded: number; total: number },
) => void;

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

const PROGRESSIVE_BATCH_SIZE = 50;

function mergeIntoResult(
  source: LoadedSessionData,
  target: LoadedSessionData,
): void {
  for (const tableName of SESSION_TABLES) {
    Object.assign(target[tableName], source[tableName]);
  }
}

export async function loadAllSessionDataProgressive(
  dataDir: string,
  onBatch: ProgressiveBatchCallback,
): Promise<LoadResult<LoadedSessionData>> {
  const result = createEmptyLoadedSessionData();
  const sessionsDir = [dataDir, "sessions"].join(sep());

  const metaScanResult = await fsSyncCommands.scanAndRead(
    sessionsDir,
    [SESSION_META_FILE],
    true,
    null,
  );

  if (metaScanResult.status === "error") {
    if (isDirectoryNotFoundError(metaScanResult.error)) {
      return ok(result);
    }
    console.error(`[${LABEL}] meta scan error:`, metaScanResult.error);
    return err(metaScanResult.error);
  }

  const sessionIds = Object.keys(metaScanResult.data.files)
    .filter((path) => path.endsWith(SESSION_META_FILE))
    .map((path) => extractSessionIdAndFolder(path).sessionId)
    .filter((id): id is string => !!id);

  const totalSessions = sessionIds.length;

  if (totalSessions === 0) {
    return ok(result);
  }

  for (let i = 0; i < totalSessions; i += PROGRESSIVE_BATCH_SIZE) {
    const batchIds = sessionIds.slice(i, i + PROGRESSIVE_BATCH_SIZE);
    const batchData = createEmptyLoadedSessionData();

    await Promise.all(
      batchIds.map(async (sessionId) => {
        const singleResult = await loadSingleSession(dataDir, sessionId);
        if (singleResult.status === "ok") {
          mergeIntoResult(singleResult.data, batchData);
        }
      }),
    );

    mergeIntoResult(batchData, result);

    onBatch(batchData, {
      loaded: Math.min(i + PROGRESSIVE_BATCH_SIZE, totalSessions),
      total: totalSessions,
    });
  }

  return ok(result);
}
