import { sep } from "@tauri-apps/api/path";

import { commands as path2Commands } from "@hypr/plugin-path2";

export const SESSION_META_FILE = "_meta.json";
export const SESSION_TRANSCRIPT_FILE = "transcript.json";
export const SESSION_NOTE_EXTENSION = ".md";
export const CHAT_MESSAGES_FILE = "messages.json";

export async function getDataDir(): Promise<string> {
  return path2Commands.base();
}

export function buildSessionPath(
  dataDir: string,
  sessionId: string,
  folderPath: string = "",
): string {
  if (folderPath) {
    const folderParts = folderPath.split("/");
    return [dataDir, "sessions", ...folderParts, sessionId].join(sep());
  }
  return [dataDir, "sessions", sessionId].join(sep());
}

export function buildChatPath(dataDir: string, chatGroupId: string): string {
  return [dataDir, "chats", chatGroupId].join(sep());
}

export function buildEntityPath(dataDir: string, dirName: string): string {
  return [dataDir, dirName].join(sep());
}

export function buildEntityFilePath(
  dataDir: string,
  dirName: string,
  id: string,
): string {
  return [dataDir, dirName, `${id}.md`].join(sep());
}

export function getParentFolderPath(folderPath: string): string {
  if (!folderPath) {
    return "";
  }
  const parts = folderPath.split("/");
  parts.pop();
  return parts.join("/");
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function createMarkdownEntityParser(dirName: string) {
  return (path: string): string | null => {
    const parts = path.split("/");
    const dirIndex = parts.indexOf(dirName);
    if (dirIndex === -1 || dirIndex + 1 >= parts.length) {
      return null;
    }
    const filename = parts[dirIndex + 1];
    if (!filename?.endsWith(".md")) {
      return null;
    }
    return filename.slice(0, -3);
  };
}

export function createFolderEntityParser(dirName: string) {
  return (path: string): string | null => {
    const parts = path.split("/");
    const dirIndex = parts.indexOf(dirName);
    if (dirIndex === -1 || dirIndex + 1 >= parts.length) {
      return null;
    }
    return parts[dirIndex + 1] || null;
  };
}
