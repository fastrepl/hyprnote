import { sep } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import { isFileNotFoundError } from "../shared/fs";
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
