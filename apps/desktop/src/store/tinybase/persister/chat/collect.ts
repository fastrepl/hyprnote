import { sep } from "@tauri-apps/api/path";

import { type CollectorResult, getChatDir, type TablesContent } from "../utils";
import { tablesToChatJsonList } from "./transform";

export type ChatCollectorResult = CollectorResult & {
  validChatGroupIds: Set<string>;
};

export function collectChatWriteOps(
  tables: TablesContent,
  dataDir: string,
): ChatCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const chatJsonList = tablesToChatJsonList(tables);

  for (const chatJson of chatJsonList) {
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
    validChatGroupIds: new Set(chatJsonList.map((c) => c.chat_group.id)),
  };
}
