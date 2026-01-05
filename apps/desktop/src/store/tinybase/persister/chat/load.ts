import { sep } from "@tauri-apps/api/path";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

import { isFileNotFoundError, isUUID } from "../utils";
import {
  type ChatJson,
  chatJsonToData,
  createEmptyLoadedData,
  type LoadedChatData,
  mergeLoadedData,
} from "./transform";

export type { LoadedChatData } from "./transform";

const LABEL = "ChatPersister";

export async function loadAllChatData(
  dataDir: string,
): Promise<LoadedChatData> {
  const chatsDir = [dataDir, "chats"].join(sep());

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(chatsDir);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] load error:`, error);
    }
    return createEmptyLoadedData();
  }

  const items: LoadedChatData[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    if (!isUUID(entry.name)) continue;

    const chatGroupId = entry.name;
    const messagesPath = [chatsDir, chatGroupId, "_messages.json"].join(sep());

    try {
      const content = await readTextFile(messagesPath);
      const json = JSON.parse(content) as ChatJson;
      items.push(chatJsonToData(json));
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

  return mergeLoadedData(items);
}
