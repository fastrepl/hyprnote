import type { ChatGroup, ChatMessageStorage } from "@hypr/store";

import { iterateTableRows, type TablesContent } from "../shared";

export type ChatGroupData = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
};

export type ChatMessageWithId = ChatMessageStorage & { id: string };

export type ChatJson = {
  chat_group: ChatGroupData;
  messages: ChatMessageWithId[];
};

export type LoadedChatData = {
  chat_groups: Record<string, ChatGroup>;
  chat_messages: Record<string, ChatMessageStorage>;
};

export function chatJsonToData(json: ChatJson): LoadedChatData {
  const result: LoadedChatData = {
    chat_groups: {},
    chat_messages: {},
  };

  const { id: groupId, ...chatGroupData } = json.chat_group;
  result.chat_groups[groupId] = chatGroupData;

  for (const message of json.messages) {
    const { id: messageId, ...messageData } = message;
    result.chat_messages[messageId] = messageData;
  }

  return result;
}

export function mergeLoadedData(items: LoadedChatData[]): LoadedChatData {
  const result: LoadedChatData = {
    chat_groups: {},
    chat_messages: {},
  };

  for (const item of items) {
    Object.assign(result.chat_groups, item.chat_groups);
    Object.assign(result.chat_messages, item.chat_messages);
  }

  return result;
}

export function tablesToChatJsonList(tables: TablesContent): ChatJson[] {
  const chatGroups = iterateTableRows(tables, "chat_groups");
  const chatMessages = iterateTableRows(tables, "chat_messages");

  const chatGroupMap = new Map<string, ChatGroupData>();
  for (const group of chatGroups) {
    chatGroupMap.set(group.id, group as ChatGroupData);
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
      existing.messages.push(message as ChatMessageWithId);
    } else {
      messagesByChatGroup.set(chatGroupId, {
        chatGroup,
        messages: [message as ChatMessageWithId],
      });
    }
  }

  const result: ChatJson[] = [];
  for (const { chatGroup, messages } of messagesByChatGroup.values()) {
    result.push({
      chat_group: chatGroup,
      messages: messages.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      ),
    });
  }

  return result;
}

export function createEmptyLoadedData(): LoadedChatData {
  return {
    chat_groups: {},
    chat_messages: {},
  };
}
