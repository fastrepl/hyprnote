import { mkdir } from "@tauri-apps/plugin-fs";

import { commands as path2Commands } from "@hypr/plugin-path2";
import type {
  ChatGroup,
  ChatMessageStorage,
  EnhancedNoteStorage,
  SessionStorage,
  SpeakerHintStorage,
  TemplateStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

export type PersisterMode = "load-only" | "save-only" | "load-and-save";

export async function getDataDir(): Promise<string> {
  return path2Commands.base();
}

export function getSessionDir(
  dataDir: string,
  sessionId: string,
  folderPath: string = "",
): string {
  const folder = folderPath || "_default";
  return `${dataDir}/sessions/${folder}/${sessionId}`;
}

export function getChatDir(dataDir: string, chatGroupId: string): string {
  return `${dataDir}/chats/${chatGroupId}`;
}

export async function ensureDirsExist(dirs: Set<string>): Promise<void> {
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes("already exists"))) {
        throw e;
      }
    }
  }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function getParentFolderPath(folderPath: string): string {
  if (!folderPath) {
    return "";
  }
  const parts = folderPath.split("/");
  parts.pop();
  return parts.join("/");
}

export function safeParseJson(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export type BatchItem<T> = [T, string];

export interface BatchCollectorResult<T> {
  items: BatchItem<T>[];
  dirs: Set<string>;
}

export type TablesContent = {
  enhanced_notes?: Record<string, EnhancedNoteStorage>;
  sessions?: Record<string, SessionStorage>;
  templates?: Record<string, TemplateStorage>;
  transcripts?: Record<string, TranscriptStorage>;
  words?: Record<string, WordStorage>;
  speaker_hints?: Record<string, SpeakerHintStorage>;
  chat_groups?: Record<string, ChatGroup>;
  chat_messages?: Record<string, ChatMessageStorage>;
};

type TableRowType<K extends keyof TablesContent> =
  NonNullable<TablesContent[K]> extends Record<string, infer R> ? R : never;

export function iterateTableRows<K extends keyof TablesContent>(
  tables: TablesContent | undefined,
  tableName: K,
): Array<TableRowType<K> & { id: string }> {
  const result: Array<TableRowType<K> & { id: string }> = [];
  const tableData = tables?.[tableName];
  if (tableData) {
    for (const [id, row] of Object.entries(tableData)) {
      result.push({ ...row, id } as TableRowType<K> & { id: string });
    }
  }
  return result;
}
