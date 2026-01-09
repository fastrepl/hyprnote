import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content } from "tinybase/with-schemas";

import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import { asTablesChanges, getDataDir } from "../shared";
import {
  createChatDeletionMarker,
  getChangedChatGroupIds,
  parseGroupIdFromPath,
} from "./changes";
import { collectChatWriteOps } from "./collect";
import { loadAllChatData, loadSingleChatGroup } from "./load";

export function createChatPersister(store: Store) {
  const deletionMarker = createChatDeletionMarker(store);

  return createCollectorPersister(store, {
    label: "ChatPersister",
    watchPaths: ["chats/"],
    cleanup: [
      {
        type: "dirs",
        subdir: "chats",
        markerFile: "_messages.json",
        validIdsKey: "validChatGroupIds",
      },
    ],
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
  });
}
