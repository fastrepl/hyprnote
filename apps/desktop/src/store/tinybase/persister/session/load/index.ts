import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

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
    if (path.endsWith("_meta.json")) {
      processMetaFile(path, content, result, now);
    }
  }

  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith("_transcript.json")) {
      processTranscriptFile(path, content, result);
    }
  }

  const mdPromises: Promise<void>[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!content) continue;
    if (path.endsWith(".md")) {
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
    ["_meta.json", "_transcript.json", "*.md"],
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
    ["_meta.json", "_transcript.json", "*.md"],
    false,
  );

  if (scanResult.status === "error") {
    return result;
  }

  await processFiles(scanResult.data.files, result, now);
  return result;
}
