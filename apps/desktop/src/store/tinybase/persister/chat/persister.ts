import type { Content } from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { ChatGroup, ChatMessageStorage, Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import {
  asTablesChanges,
  type ChangedTables,
  type CollectorResult,
  getDataDir,
  type TablesContent,
} from "../shared";
import { collectChatWriteOps } from "./collect";
import { loadAllChatData, type LoadedChatData } from "./load";

type LoadResultWithDeletions = {
  chat_groups: Record<string, ChatGroup | undefined>;
  chat_messages: Record<string, ChatMessageStorage | undefined>;
};

function markDeletedRows(
  store: Store,
  loaded: LoadedChatData,
): LoadResultWithDeletions {
  const existingGroups = store.getTable("chat_groups") ?? {};
  const existingMessages = store.getTable("chat_messages") ?? {};

  const existingGroupIds = new Set(Object.keys(existingGroups));
  const existingMessageIds = new Set(Object.keys(existingMessages));

  const loadedGroupIds = new Set(Object.keys(loaded.chat_groups));
  const loadedMessageIds = new Set(Object.keys(loaded.chat_messages));

  const resultGroups: Record<string, ChatGroup | undefined> = {
    ...loaded.chat_groups,
  };
  const resultMessages: Record<string, ChatMessageStorage | undefined> = {
    ...loaded.chat_messages,
  };

  for (const id of existingGroupIds) {
    if (!loadedGroupIds.has(id)) {
      resultGroups[id] = undefined;
    }
  }

  for (const id of existingMessageIds) {
    if (!loadedMessageIds.has(id)) {
      resultMessages[id] = undefined;
    }
  }

  return {
    chat_groups: resultGroups,
    chat_messages: resultMessages,
  };
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
  return createCollectorPersister(store, {
    label: "ChatPersister",
    watchPaths: ["chats/"],
    postSaveAlways: true,
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

        const result = markDeletedRows(store, data);

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
        { type: "dirs", subdir: "chats", marker_file: "messages.json" },
        Array.from(validChatGroupIds),
      );
    },
  });
}
