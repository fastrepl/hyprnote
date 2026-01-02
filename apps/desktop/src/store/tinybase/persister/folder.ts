import { exists, readDir } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as notifyCommands,
  events as notifyEvents,
} from "@hypr/plugin-notify";
import { commands as path2Commands } from "@hypr/plugin-path2";
import type { FolderStorage } from "@hypr/store";

import { DEFAULT_USER_ID } from "../../../utils";
import { StoreOrMergeableStore } from "../store/shared";
import { getParentFolderPath, type PersisterMode } from "./utils";

type FoldersJson = Record<string, FolderStorage>;

interface ScanResult {
  folders: FoldersJson;
  sessionFolderMap: Map<string, string>;
}

async function getSessionsDir(): Promise<string> {
  const base = await path2Commands.base();
  return `${base}/sessions`;
}

async function scanDirectoryRecursively(
  sessionsDir: string,
  currentPath: string = "",
): Promise<ScanResult> {
  const folders: FoldersJson = {};
  const sessionFolderMap = new Map<string, string>();

  const fullPath = currentPath ? `${sessionsDir}/${currentPath}` : sessionsDir;

  try {
    const entries = await readDir(fullPath);

    for (const entry of entries) {
      if (!entry.isDirectory) {
        continue;
      }

      const entryPath = currentPath
        ? `${currentPath}/${entry.name}`
        : entry.name;

      const hasMemoMd = await exists(`${sessionsDir}/${entryPath}/_memo.md`);

      if (hasMemoMd) {
        const folderPath = currentPath === "_default" ? "" : currentPath;
        sessionFolderMap.set(entry.name, folderPath);
      } else {
        if (entry.name !== "_default") {
          folders[entryPath] = {
            user_id: DEFAULT_USER_ID,
            created_at: new Date().toISOString(),
            name: entry.name,
            parent_folder_id: getParentFolderPath(entryPath),
          };
        }

        const subResult = await scanDirectoryRecursively(
          sessionsDir,
          entryPath,
        );

        for (const [id, folder] of Object.entries(subResult.folders)) {
          folders[id] = folder;
        }
        for (const [sessionId, folderPath] of subResult.sessionFolderMap) {
          sessionFolderMap.set(sessionId, folderPath);
        }
      }
    }
  } catch (error) {
    const errorStr = String(error);
    if (
      !errorStr.includes("No such file or directory") &&
      !errorStr.includes("ENOENT") &&
      !errorStr.includes("not found")
    ) {
      console.error("[FolderPersister] scan error:", error);
    }
  }

  return { folders, sessionFolderMap };
}

export function jsonToContent<Schemas extends OptionalSchemas>(
  data: FoldersJson,
): Content<Schemas> {
  return [{ folders: data }, {}] as unknown as Content<Schemas>;
}

export function createFolderPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "load-only" },
) {
  const loadFn =
    config.mode === "save-only"
      ? async (): Promise<Content<Schemas> | undefined> => undefined
      : async (): Promise<Content<Schemas> | undefined> => {
          try {
            const sessionsDir = await getSessionsDir();
            const dirExists = await exists(sessionsDir);

            if (!dirExists) {
              return jsonToContent<Schemas>({});
            }

            const { folders, sessionFolderMap } =
              await scanDirectoryRecursively(sessionsDir);

            for (const [sessionId, folderPath] of sessionFolderMap) {
              // @ts-ignore - we're setting cells on the sessions table
              if (store.hasRow("sessions", sessionId)) {
                // @ts-ignore
                store.setCell("sessions", sessionId, "folder_id", folderPath);
              }
            }

            return jsonToContent<Schemas>(folders);
          } catch (error) {
            console.error("[FolderPersister] load error:", error);
            return undefined;
          }
        };

  const saveFn = async () => {};

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => setInterval(listener, 5000),
    (handle) => clearInterval(handle),
    (error) => console.error("[FolderPersister]:", error),
    StoreOrMergeableStore,
  );
}

interface Loadable {
  load(): Promise<unknown>;
}

export async function startFolderWatcher(
  persister: Loadable,
): Promise<() => void> {
  const result = await notifyCommands.start();
  if (result.status === "error") {
    console.error("[FolderWatcher] Failed to start:", result.error);
    return () => {};
  }

  const unlisten = await notifyEvents.fileChanged.listen(async (event) => {
    const path = event.payload.path;
    if (path.startsWith("sessions/")) {
      try {
        await persister.load();
      } catch (error) {
        console.error("[FolderWatcher] Failed to reload:", error);
      }
    }
  });

  return () => {
    unlisten();
    void notifyCommands.stop();
  };
}
