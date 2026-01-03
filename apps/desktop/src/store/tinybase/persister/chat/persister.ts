import { sep } from "@tauri-apps/api/path";
import { exists, readDir, remove } from "@tauri-apps/plugin-fs";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSessionDirPersister, isUUID } from "../utils";
import { type ChatCollectorResult, collectChatWriteOps } from "./collect";

async function cleanupOrphanChatDirs(
  dataDir: string,
  validChatGroupIds: Set<string>,
): Promise<void> {
  const chatsDir = [dataDir, "chats"].join(sep());

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(chatsDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const messagesPath = [chatsDir, entry.name, "_messages.json"].join(sep());
    const hasMessagesJson = await exists(messagesPath);

    if (
      hasMessagesJson &&
      isUUID(entry.name) &&
      !validChatGroupIds.has(entry.name)
    ) {
      try {
        const dirPath = [chatsDir, entry.name].join(sep());
        if (await exists(dirPath)) {
          await remove(dirPath, { recursive: true });
        }
      } catch {
        // Ignore errors - directory may have been removed by another process
      }
    }
  }
}

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  let lastValidChatGroupIds: Set<string> = new Set();

  return createSessionDirPersister(store, {
    label: "ChatPersister",
    collect: (_store, tables, dataDir) => {
      const result: ChatCollectorResult = collectChatWriteOps(tables, dataDir);
      lastValidChatGroupIds = result.validChatGroupIds;
      return result;
    },
    postSave: async (dataDir) => {
      await cleanupOrphanChatDirs(dataDir, lastValidChatGroupIds);
    },
  });
}
