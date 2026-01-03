import { sep } from "@tauri-apps/api/path";

import type { ChatMessageStorage } from "@hypr/store";

import {
  type CollectorResult,
  getChatDir,
  iterateTableRows,
  type TablesContent,
} from "../utils";

type ChatGroupData = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
};

type ChatMessageWithId = ChatMessageStorage & { id: string };

type ChatJson = {
  chat_group: ChatGroupData;
  messages: ChatMessageWithId[];
};

export type ChatCollectorResult = CollectorResult & {
  validChatGroupIds: Set<string>;
};

export function collectChatWriteOps(
  tables: TablesContent,
  dataDir: string,
): ChatCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];

  const chatGroups = iterateTableRows(tables, "chat_groups");
  const chatMessages = iterateTableRows(tables, "chat_messages");

  const chatGroupMap = new Map<string, ChatGroupData>();
  for (const group of chatGroups) {
    chatGroupMap.set(group.id, group);
  }

  const messagesByChatGroup = new Map<
    string,
    { chatGroup: ChatGroupData; messages: ChatMessageWithId[] }
  >();

  for (const message of chatMessages) {
    const chatGroupId = message.chat_group_id;
    if (!chatGroupId) continue;

    const chatGroup = chatGroupMap.get(chatGroupId);
    if (!chatGroup) continue;

    const existing = messagesByChatGroup.get(chatGroupId);
    if (existing) {
      existing.messages.push(message);
    } else {
      messagesByChatGroup.set(chatGroupId, {
        chatGroup,
        messages: [message],
      });
    }
  }

  for (const [chatGroupId, { chatGroup, messages }] of messagesByChatGroup) {
    const chatDir = getChatDir(dataDir, chatGroupId);
    dirs.add(chatDir);

    const content: ChatJson = {
      chat_group: chatGroup,
      messages: messages.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      ),
    };

    operations.push({
      type: "json",
      path: [chatDir, "_messages.json"].join(sep()),
      content,
    });
  }

  return {
    dirs,
    operations,
    validChatGroupIds: new Set(messagesByChatGroup.keys()),
  };
}
