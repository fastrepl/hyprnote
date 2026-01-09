import { sep } from "@tauri-apps/api/path";

import {
  buildChatPath,
  type CollectorResult,
  type TablesContent,
  type WriteOperation,
} from "../shared";
import { tablesToChatJsonList } from "./transform";

export type ChatCollectorResult = CollectorResult & {
  validChatGroupIds: Set<string>;
};

export function collectChatWriteOps(
  tables: TablesContent,
  dataDir: string,
  changedGroupIds?: Set<string>,
): ChatCollectorResult {
  const operations: CollectorResult["operations"] = [];

  const chatJsonList = tablesToChatJsonList(tables);
  const allGroupIds = new Set(Object.keys(tables.chat_groups ?? {}));
  const groupsWithMessages = new Set(chatJsonList.map((c) => c.chat_group.id));

  if (changedGroupIds) {
    const deletedIds: string[] = [];

    for (const id of changedGroupIds) {
      if (groupsWithMessages.has(id)) {
        const chatJson = chatJsonList.find((c) => c.chat_group.id === id)!;
        const chatDir = buildChatPath(dataDir, id);
        operations.push({
          type: "json",
          path: [chatDir, "_messages.json"].join(sep()),
          content: chatJson,
        });
      } else if (allGroupIds.has(id)) {
        const chatGroup = tables.chat_groups![id];
        const chatDir = buildChatPath(dataDir, id);
        operations.push({
          type: "json",
          path: [chatDir, "_messages.json"].join(sep()),
          content: { chat_group: { id, ...chatGroup }, messages: [] },
        });
      } else {
        deletedIds.push(id);
      }
    }

    if (deletedIds.length > 0) {
      const deleteOps: WriteOperation = {
        type: "delete-batch",
        paths: deletedIds.map((id) =>
          [buildChatPath(dataDir, id), "_messages.json"].join(sep()),
        ),
      };
      operations.push(deleteOps);
    }

    return {
      operations,
      validChatGroupIds: allGroupIds,
    };
  }

  for (const chatJson of chatJsonList) {
    const chatGroupId = chatJson.chat_group.id;
    const chatDir = buildChatPath(dataDir, chatGroupId);

    operations.push({
      type: "json",
      path: [chatDir, "_messages.json"].join(sep()),
      content: chatJson,
    });
  }

  for (const id of allGroupIds) {
    if (!groupsWithMessages.has(id)) {
      const chatGroup = tables.chat_groups![id];
      const chatDir = buildChatPath(dataDir, id);
      operations.push({
        type: "json",
        path: [chatDir, "_messages.json"].join(sep()),
        content: { chat_group: { id, ...chatGroup }, messages: [] },
      });
    }
  }

  return {
    operations,
    validChatGroupIds: allGroupIds,
  };
}
