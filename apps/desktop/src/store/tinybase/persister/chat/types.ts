import type { ChatGroup, ChatMessageStorage } from "@hypr/store";

export type ChatGroupData = ChatGroup & { id: string };

export type ChatMessageWithId = ChatMessageStorage & { id: string };

export type ChatJson = {
  chat_group: ChatGroupData;
  messages: ChatMessageWithId[];
};

export type LoadedChatData = {
  chat_groups: Record<string, ChatGroup>;
  chat_messages: Record<string, ChatMessageStorage>;
};
