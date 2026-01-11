import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createMultiTableDirPersister } from "../factories";
import type { TablesContent } from "../shared";
import { getChangedChatGroupIds, parseChatGroupIdFromPath } from "./changes";
import {
  loadAllChatGroups,
  type LoadedChatData,
  loadSingleChatGroup,
} from "./load";
import { buildChatSaveOps } from "./save";

export function createChatPersister(store: Store) {
  return createMultiTableDirPersister<Schemas, LoadedChatData>(store, {
    label: "ChatPersister",
    dirName: "chats",
    entityParser: parseChatGroupIdFromPath,
    tables: [
      { tableName: "chat_groups", isPrimary: true },
      { tableName: "chat_messages", foreignKey: "chat_group_id" },
    ],
    cleanup: [
      {
        type: "dirs",
        subdir: "chats",
        markerFile: "messages.json",
        getIdsToKeep: getChatGroupIdsToKeep,
      },
    ],
    loadAll: loadAllChatGroups,
    loadSingle: loadSingleChatGroup,
    save: (_store, tables, dataDir, changedTables) => {
      let changedGroupIds: Set<string> | undefined;

      if (changedTables) {
        const changeResult = getChangedChatGroupIds(tables, changedTables);
        if (!changeResult) {
          return { operations: [] };
        }
        changedGroupIds = changeResult.changedChatGroupIds;
      }

      return {
        operations: buildChatSaveOps(tables, dataDir, changedGroupIds),
      };
    },
  });
}

function getChatGroupIdsToKeep(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.chat_groups ?? {}));
}
