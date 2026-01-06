import { sep } from "@tauri-apps/api/path";

import {
  type CollectorResult,
  getChatDir,
  type TablesContent,
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
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const chatJsonList = tablesToChatJsonList(tables);

  const groupsToProcess = changedGroupIds
    ? chatJsonList.filter((c) => changedGroupIds.has(c.chat_group.id))
    : chatJsonList;

  for (const chatJson of groupsToProcess) {
    const chatGroupId = chatJson.chat_group.id;
    const chatDir = getChatDir(dataDir, chatGroupId);
    dirs.add(chatDir);

    operations.push({
      type: "json",
      path: [chatDir, "_messages.json"].join(sep()),
      content: chatJson,
    });
  }

  return {
    dirs,
    operations,
    validChatGroupIds: changedGroupIds
      ? new Set<string>()
      : new Set(chatJsonList.map((c) => c.chat_group.id)),
  };
}
