import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import {
  commands as notifyCommands,
  events as notifyEvents,
} from "@hypr/plugin-notify";

import { DEFAULT_USER_ID } from "../../../../utils";
import { StoreOrMergeableStore } from "../../store/shared";
import { asTablesChanges } from "../shared";

export function createFolderPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  const loadFn = async () => {
    try {
      const result = await fsSyncCommands.listFolders();
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

      // @ts-ignore - sync store with filesystem state
      store.transaction(() => {
        // Delete folders that exist in store but not on filesystem
        // @ts-ignore
        const currentFolderIds = store.getRowIds("folders") as string[];
        for (const id of currentFolderIds) {
          if (!foldersData[id]) {
            // @ts-ignore
            store.delRow("folders", id);
          }
        }

        // Update session folder_id
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

      return asTablesChanges({ folders: foldersData }) as any;
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

// Debounce delay for batching rapid filesystem changes
const DEBOUNCE_MS = 500;
// Periodic reconciliation interval as a safety net
const RECONCILE_INTERVAL_MS = 30000;

// Flag to track internal changes (from app operations)
let isInternalChange = false;

/**
 * Mark the next filesystem change as internal (from app operations).
 * This prevents the watcher from reloading when we make changes ourselves.
 */
export function markInternalChange() {
  isInternalChange = true;
}

export async function startFolderWatcher(
  persister: Loadable,
): Promise<() => void> {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const result = await notifyCommands.start();
  if (result.status === "error") {
    console.error("[FolderWatcher] Failed to start:", result.error);
    return () => {};
  }

  const reloadDebounced = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (isInternalChange) {
        isInternalChange = false;
        return;
      }

      console.log("[FolderWatcher] External change detected, reloading...");
      try {
        await persister.load();
      } catch (error) {
        console.error("[FolderWatcher] Failed to reload:", error);
      }
    }, DEBOUNCE_MS);
  };

  const unlisten = await notifyEvents.fileChanged.listen((event) => {
    const path = event.payload.path;
    if (path.startsWith("sessions/")) {
      reloadDebounced();
    }
  });

  // Periodic reconciliation as a safety net
  const reconcileInterval = setInterval(async () => {
    try {
      await persister.load();
    } catch (error) {
      console.error("[FolderWatcher] Reconciliation failed:", error);
    }
  }, RECONCILE_INTERVAL_MS);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    clearInterval(reconcileInterval);
    unlisten();
    void notifyCommands.stop();
  };
}
