import { sep } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import { isFileNotFoundError } from "../shared/fs";
import type { ChatJson, LoadedChatData } from "./types";

export type { LoadedChatData } from "./types";

const LABEL = "ChatPersister";

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

export function createEmptyLoadedData(): LoadedChatData {
  return {
    chat_groups: {},
    chat_messages: {},
  };
}

export async function loadAllChatData(
  dataDir: string,
): Promise<LoadedChatData> {
  const chatsDir = [dataDir, "chats"].join(sep());

  const scanResult = await fsSyncCommands.scanAndRead(
    chatsDir,
    ["_messages.json"],
    false,
  );

  if (scanResult.status === "error") {
    console.error(`[${LABEL}] scan error:`, scanResult.error);
    return createEmptyLoadedData();
  }

  const { files } = scanResult.data;
  const items: LoadedChatData[] = [];

  for (const [, content] of Object.entries(files)) {
    if (!content) continue;
    try {
      const json = JSON.parse(content) as ChatJson;
      items.push(chatJsonToData(json));
    } catch (error) {
      console.error(`[${LABEL}] Failed to parse chat JSON:`, error);
    }
  }

  return mergeLoadedData(items);
}

export async function loadSingleChatGroup(
  dataDir: string,
  groupId: string,
): Promise<LoadedChatData> {
  const filePath = [dataDir, "chats", groupId, "_messages.json"].join(sep());

  try {
    const content = await readTextFile(filePath);
    const json = JSON.parse(content) as ChatJson;
    return chatJsonToData(json);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] Failed to load chat group ${groupId}:`, error);
    }
    return createEmptyLoadedData();
  }
}
