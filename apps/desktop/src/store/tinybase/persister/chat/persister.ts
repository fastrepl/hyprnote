import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { createCollectorPersister } from "../factories";
import {
  getDataDir,
  type PersistedChanges,
  type TablesContent,
} from "../shared";
import { collectChatWriteOps } from "./collect";
import { loadAllChatData } from "./load";

function getChangedChatGroupIds(
  tables: TablesContent,
  changes: PersistedChanges,
): Set<string> | undefined {
  const [changedTables] = changes;
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
      if (message?.group_id) {
        changedGroupIds.add(message.group_id);
      }
    }
  }

  if (changedGroupIds.size === 0) {
    return undefined;
  }

  return changedGroupIds;
}

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createCollectorPersister(store, {
    label: "ChatPersister",
    collect: (_store, tables, dataDir, changes) => {
      let changedGroupIds: Set<string> | undefined;

      if (changes) {
        changedGroupIds = getChangedChatGroupIds(tables, changes);
        if (!changedGroupIds) {
          return {
            dirs: new Set(),
            operations: [],
            validChatGroupIds: new Set(),
          };
        }
      }

      return collectChatWriteOps(tables, dataDir, changedGroupIds);
    },
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllChatData(dataDir);
        const hasData =
          Object.keys(data.chat_groups).length > 0 ||
          Object.keys(data.chat_messages).length > 0;
        if (!hasData) {
          return undefined;
        }
        return [
          {
            chat_groups: data.chat_groups,
            chat_messages: data.chat_messages,
          },
          {},
        ] as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[ChatPersister] load error:", error);
        return undefined;
      }
    },
  });
}
