import { sep } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

import type { ChatGroup, ChatMessageStorage } from "@hypr/store";

import { isFileNotFoundError, isUUID } from "../utils";

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

export type LoadedChatData = {
  chat_groups: Record<string, ChatGroup>;
  chat_messages: Record<string, ChatMessageStorage>;
};

const LABEL = "ChatPersister";

export async function loadAllChatData(
  dataDir: string,
): Promise<LoadedChatData> {
  const result: LoadedChatData = {
    chat_groups: {},
    chat_messages: {},
  };

  const chatsDir = [dataDir, "chats"].join(sep());

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(chatsDir);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] load error:`, error);
    }
    return result;
  }

  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    if (!isUUID(entry.name)) continue;

    const chatGroupId = entry.name;
    const messagesPath = [chatsDir, chatGroupId, "_messages.json"].join(sep());

    try {
      const content = await readTextFile(messagesPath);
      const data = JSON.parse(content) as ChatJson;

      const { id: _groupId, ...chatGroupData } = data.chat_group;
      result.chat_groups[chatGroupId] = chatGroupData;

      for (const message of data.messages) {
        const { id: messageId, ...messageData } = message;
        result.chat_messages[messageId] = messageData;
      }
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        console.error(
          `[${LABEL}] Failed to load chat from ${messagesPath}:`,
          error,
        );
      }
      continue;
    }
  }

  return result;
}
