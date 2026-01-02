import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

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

import { StoreOrMergeableStore } from "../store/shared";

export type PersisterMode = "load-only" | "save-only" | "load-and-save";

export async function getDataDir(): Promise<string> {
  return path2Commands.base();
}

export function getSessionDir(dataDir: string, sessionId: string): string {
  return `${dataDir}/sessions/${sessionId}`;
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

function isFileNotFoundError(error: unknown): boolean {
  const errorStr = String(error);
  return (
    errorStr.includes("No such file or directory") ||
    errorStr.includes("ENOENT") ||
    errorStr.includes("not found")
  );
}

export function createSimpleJsonPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    tableName: string;
    filename: string;
    label: string;
    mode?: PersisterMode;
  },
) {
  const { tableName, filename, label, mode = "save-only" } = options;

  const jsonToContent = (data: Record<string, unknown>): Content<Schemas> =>
    [{ [tableName]: data }, {}] as unknown as Content<Schemas>;

  const loadFn =
    mode === "save-only"
      ? async (): Promise<Content<Schemas> | undefined> => undefined
      : async (): Promise<Content<Schemas> | undefined> => {
          try {
            const base = await path2Commands.base();
            const content = await readTextFile(`${base}/${filename}`);
            return jsonToContent(JSON.parse(content));
          } catch (error) {
            if (isFileNotFoundError(error)) return jsonToContent({});
            console.error(`[${label}] load error:`, error);
            return undefined;
          }
        };

  const saveFn =
    mode === "load-only"
      ? async () => {}
      : async () => {
          try {
            const base = await path2Commands.base();
            await mkdir(base, { recursive: true });
            const data = store.getTable(tableName) ?? {};
            await writeTextFile(
              `${base}/${filename}`,
              JSON.stringify(data, null, 2),
            );
          } catch (error) {
            console.error(`[${label}] save error:`, error);
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    (listener) => setInterval(listener, 1000),
    (handle) => clearInterval(handle),
    (error) => console.error(`[${label}]:`, error),
    StoreOrMergeableStore,
  );
}
