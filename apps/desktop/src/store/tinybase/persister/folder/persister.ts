import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as folderCommands } from "@hypr/plugin-folder";
import {
  commands as notifyCommands,
  events as notifyEvents,
} from "@hypr/plugin-notify";

import { DEFAULT_USER_ID } from "../../../../utils";
import { StoreOrMergeableStore } from "../../store/shared";
import { asTableChanges } from "../utils";

export function createFolderPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  const loadFn = async () => {
    try {
      const result = await folderCommands.listFolders();
      if (result.status === "error") {
        console.error("[FolderPersister] list error:", result.error);
        return undefined;
      }

      const { folders, session_folder_map } = result.data;
      const now = new Date().toISOString();

      const foldersData: Record<
        string,
        {
          user_id: string;
          created_at: string;
          name: string;
          parent_folder_id: string;
        }
      > = {};

      for (const [folderId, folder] of Object.entries(folders)) {
        if (!folder) continue;
        foldersData[folderId] = {
          user_id: DEFAULT_USER_ID,
          created_at: now,
          name: folder.name,
          parent_folder_id: folder.parent_folder_id ?? "",
        };
      }

      // @ts-ignore - update session folder_id only (do not delete sessions here)
      store.transaction(() => {
        for (const [sessionId, folderPath] of Object.entries(
          session_folder_map,
        )) {
          // @ts-ignore
          if (store.hasRow("sessions", sessionId)) {
            // @ts-ignore
            store.setCell("sessions", sessionId, "folder_id", folderPath);
          }
        }
      });

      return asTableChanges("folders", foldersData) as any;
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
    () => null,
    () => {},
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
