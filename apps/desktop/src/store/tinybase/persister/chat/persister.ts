import type { Content } from "tinybase/with-schemas";

import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import { type ChangedTables, getDataDir, type TablesContent } from "../shared";
import { collectChatWriteOps } from "./collect";
import { loadAllChatData } from "./load";

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
    collect: (_store, tables, dataDir, changedTables) => {
      let changedGroupIds: Set<string> | undefined;

      if (changedTables) {
        changedGroupIds = getChangedChatGroupIds(tables, changedTables);
        if (!changedGroupIds) {
          return {
            operations: [],
            validChatGroupIds: new Set(),
          };
        }
      }

      return collectChatWriteOps(tables, dataDir, changedGroupIds);
    },
    load: async () => {
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
        ] as Content<Schemas>;
      } catch (error) {
        console.error("[ChatPersister] load error:", error);
        return undefined;
      }
    },
  });
}
