import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content } from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import {
  asTablesChanges,
  type ChangedTables,
  type CollectorResult,
  createDeletionMarker,
  getDataDir,
  type TablesContent,
} from "../shared";
import { collectChatWriteOps } from "./collect";
import {
  loadAllChatData,
  type LoadedChatData,
  loadSingleChatGroup,
} from "./load";

function createChatDeletionMarker(store: Store) {
  return createDeletionMarker<LoadedChatData>(store, [
    { tableName: "chat_groups", isPrimary: true },
    { tableName: "chat_messages", foreignKey: "chat_group_id" },
  ]);
}

function parseGroupIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const chatsIndex = parts.indexOf("chats");
  if (chatsIndex === -1 || chatsIndex + 1 >= parts.length) {
    return null;
  }
  return parts[chatsIndex + 1] || null;
}

function getChangedChatGroupIds(
  tables: TablesContent,
  changedTables: ChangedTables,
): Set<string> | undefined {
  const changedGroupIds = new Set<string>();

  const changedGroups = changedTables.chat_groups;
  if (changedGroups) {
    for (const id of Object.keys(changedGroups)) {
      changedGroupIds.add(id);
    }
  }

  const changedMessages = changedTables.chat_messages;
  if (changedMessages) {
    for (const id of Object.keys(changedMessages)) {
      const message = tables.chat_messages?.[id];
      if (message?.chat_group_id) {
        changedGroupIds.add(message.chat_group_id);
      }
    }
  }

  if (changedGroupIds.size === 0) {
    return undefined;
  }

  return changedGroupIds;
}

export function createChatPersister(store: Store) {
  const deletionMarker = createChatDeletionMarker(store);

  return createCollectorPersister(store, {
    label: "ChatPersister",
    watchPaths: ["chats/"],
    postSaveAlways: true,
    entityParser: parseGroupIdFromPath,
    loadSingle: async (groupId: string) => {
      try {
        const dataDir = await getDataDir();
        const data = await loadSingleChatGroup(dataDir, groupId);

        const result = deletionMarker.markForEntity(data, groupId);

        const hasChanges =
          Object.keys(result.chat_groups).length > 0 ||
          Object.keys(result.chat_messages).length > 0;

        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          chat_groups: result.chat_groups,
          chat_messages: result.chat_messages,
        }) as unknown as PersistedChanges<
          Schemas,
          Persists.StoreOrMergeableStore
        >;
      } catch (error) {
        console.error(
          `[ChatPersister] loadSingle error for ${groupId}:`,
          error,
        );
        return undefined;
      }
    },
    collect: (_store, tables, dataDir, changedTables) => {
      let changedGroupIds: Set<string> | undefined;

      if (changedTables) {
        changedGroupIds = getChangedChatGroupIds(tables, changedTables);
        if (!changedGroupIds) {
          const allGroupIds = new Set(Object.keys(tables.chat_groups ?? {}));
          return {
            operations: [],
            validChatGroupIds: allGroupIds,
          };
        }
      }

      return collectChatWriteOps(tables, dataDir, changedGroupIds);
    },
    load: async () => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllChatData(dataDir);

        const result = deletionMarker.markAll(data);

        const hasChanges =
          Object.keys(result.chat_groups).length > 0 ||
          Object.keys(result.chat_messages).length > 0;
        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          chat_groups: result.chat_groups,
          chat_messages: result.chat_messages,
        }) as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[ChatPersister] load error:", error);
        return undefined;
      }
    },
    postSave: async (_dataDir, result) => {
      const { validChatGroupIds } = result as CollectorResult & {
        validChatGroupIds: Set<string>;
      };
      if (validChatGroupIds.size === 0) {
        return;
      }
      await fsSyncCommands.cleanupOrphan(
        { type: "dirs", subdir: "chats", marker_file: "_messages.json" },
        Array.from(validChatGroupIds),
      );
    },
  });
}
