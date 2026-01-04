import { sep } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as exportCommands,
  type JsonValue as ExportJsonValue,
} from "@hypr/plugin-export";
import {
  commands as frontmatterCommands,
  type ParsedDocument,
} from "@hypr/plugin-frontmatter";
import { events as notifyEvents } from "@hypr/plugin-notify";
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

export type { ExportJsonValue as JsonValue };

// https://github.com/tinyplex/tinybase/blob/aa5cb9014f6def18266414174e0fd31ccfae0828/src/persisters/common/create.ts#L185
// When content[2] === 1, TinyBase uses applyChanges() instead of setContent(),
// allowing us to merge into a specific table without wiping other tables.
export function asTableChanges(
  tableName: string,
  data: Record<string, Record<string, unknown>>,
): [Record<string, unknown>, Record<string, unknown>, 1] {
  return [{ [tableName]: data }, {}, 1];
}

export async function getDataDir(): Promise<string> {
  return path2Commands.base();
}

export function getSessionDir(
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

export function getChatDir(dataDir: string, chatGroupId: string): string {
  return [dataDir, "chats", chatGroupId].join(sep());
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

export function isFileNotFoundError(error: unknown): boolean {
  const errorStr = String(error);
  return (
    errorStr.includes("No such file or directory") ||
    errorStr.includes("ENOENT") ||
    errorStr.includes("not found")
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

type NotifyListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
};

const FALLBACK_POLL_INTERVAL = 60000;

export function createNotifyListener(
  pathMatcher: (path: string) => boolean,
  fallbackIntervalMs = FALLBACK_POLL_INTERVAL,
): {
  addListener: (listener: () => void) => NotifyListenerHandle;
  delListener: (handle: NotifyListenerHandle) => void;
} {
  return {
    addListener: (listener: () => void) => {
      const handle: NotifyListenerHandle = { unlisten: null, interval: null };

      (async () => {
        const unlisten = await notifyEvents.fileChanged.listen((event) => {
          if (pathMatcher(event.payload.path)) {
            listener();
          }
        });
        handle.unlisten = unlisten;
      })().catch((error) => {
        console.error("[NotifyListener] Failed to setup:", error);
      });

      handle.interval = setInterval(listener, fallbackIntervalMs);
      return handle;
    },
    delListener: (handle: NotifyListenerHandle) => {
      handle.unlisten?.();
      if (handle.interval) clearInterval(handle.interval);
    },
  };
}

export async function writeJsonFiles(
  operations: Array<{ path: string; content: unknown }>,
  dirs: Set<string>,
): Promise<void> {
  if (operations.length === 0) return;

  await ensureDirsExist(dirs);
  for (const op of operations) {
    try {
      await writeTextFile(op.path, JSON.stringify(op.content, null, 2));
    } catch (e) {
      console.error(`Failed to write ${op.path}:`, e);
    }
  }
}

export function createModeAwarePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    label: string;
    load: () => Promise<Content<Schemas> | undefined>;
    save: () => Promise<void>;
  },
) {
  return createCustomPersister(
    store,
    options.load,
    options.save,
    () => null,
    () => {},
    (error) => console.error(`[${options.label}]:`, error),
    StoreOrMergeableStore,
  );
}

export type WriteOperation =
  | { type: "json"; path: string; content: unknown }
  | { type: "md-batch"; items: Array<[ExportJsonValue, string]> }
  | { type: "text"; path: string; content: string }
  | { type: "frontmatter-batch"; items: Array<[ParsedDocument, string]> };

export type CollectorResult = {
  dirs: Set<string>;
  operations: WriteOperation[];
};

export function createSessionDirPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    label: string;
    collect: (
      store: MergeableStore<Schemas>,
      tables: TablesContent,
      dataDir: string,
    ) => CollectorResult;
    load?: () => Promise<Content<Schemas> | undefined>;
    postSave?: (dataDir: string, result: CollectorResult) => Promise<void>;
  },
) {
  const loadFn = options.load ?? (async () => undefined);

  const saveFn = async () => {
    try {
      const dataDir = await getDataDir();
      const tables = store.getTables() as TablesContent | undefined;
      const result = options.collect(store, tables ?? {}, dataDir);
      const { dirs, operations } = result;

      if (operations.length === 0) {
        return;
      }

      await ensureDirsExist(dirs);

      const jsonBatchItems: Array<[ExportJsonValue, string]> = [];
      let mdBatchItems: Array<[ExportJsonValue, string]> = [];
      let frontmatterBatchItems: Array<[ParsedDocument, string]> = [];
      const textItems: Array<{ path: string; content: string }> = [];

      for (const op of operations) {
        if (op.type === "json") {
          jsonBatchItems.push([op.content as ExportJsonValue, op.path]);
        } else if (op.type === "md-batch") {
          mdBatchItems = mdBatchItems.concat(op.items);
        } else if (op.type === "frontmatter-batch") {
          frontmatterBatchItems = frontmatterBatchItems.concat(op.items);
        } else if (op.type === "text") {
          textItems.push({ path: op.path, content: op.content });
        }
      }

      if (jsonBatchItems.length > 0) {
        const exportResult =
          await exportCommands.exportJsonBatch(jsonBatchItems);
        if (exportResult.status === "error") {
          console.error(
            `[${options.label}] Failed to export json batch:`,
            exportResult.error,
          );
        }
      }

      if (mdBatchItems.length > 0) {
        const exportResult =
          await exportCommands.exportTiptapJsonToMdBatch(mdBatchItems);
        if (exportResult.status === "error") {
          console.error(
            `[${options.label}] Failed to export md batch:`,
            exportResult.error,
          );
        }
      }

      if (frontmatterBatchItems.length > 0) {
        const result = await frontmatterCommands.serializeBatch(
          frontmatterBatchItems,
        );
        if (result.status === "error") {
          console.error(
            `[${options.label}] Failed to serialize frontmatter batch:`,
            result.error,
          );
        }
      }

      for (const item of textItems) {
        try {
          await writeTextFile(item.path, item.content);
        } catch (e) {
          console.error(
            `[${options.label}] Failed to write text file ${item.path}:`,
            e,
          );
        }
      }

      if (options.postSave) {
        await options.postSave(dataDir, result);
      }
    } catch (error) {
      console.error(`[${options.label}] save error:`, error);
    }
  };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    () => null,
    () => {},
    (error) => console.error(`[${options.label}]:`, error),
    StoreOrMergeableStore,
  );
}

async function loadTableData(
  filename: string,
  label: string,
): Promise<Record<string, Record<string, unknown>> | undefined> {
  try {
    const base = await path2Commands.base();
    const content = await readTextFile([base, filename].join(sep()));
    return JSON.parse(content);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${label}] load error:`, error);
    }
    return undefined;
  }
}

export function createSingleTablePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    tableName: string;
    filename: string;
    label: string;
  },
) {
  const { tableName, filename, label } = options;

  const notifyListener = createNotifyListener((path) =>
    path.endsWith(filename),
  );

  return createCustomPersister(
    store,
    async () => {
      const data = await loadTableData(filename, label);
      if (!data) return undefined;
      return asTableChanges(tableName, data) as any;
    },
    async () => {
      try {
        const base = await path2Commands.base();
        await mkdir(base, { recursive: true });
        const data = (store.getTable(tableName as any) ?? {}) as Record<
          string,
          unknown
        >;
        await writeTextFile(
          [base, filename].join(sep()),
          JSON.stringify(data, null, 2),
        );
      } catch (error) {
        console.error(`[${label}] save error:`, error);
      }
    },
    (listener) => {
      return notifyListener.addListener(async () => {
        const data = await loadTableData(filename, label);
        if (data) {
          listener(undefined, asTableChanges(tableName, data) as any);
        }
      });
    },
    notifyListener.delListener,
    (error) => console.error(`[${label}]:`, error),
    StoreOrMergeableStore,
  );
}
